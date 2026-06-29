import type { Id } from "@legacy-building/backend/convex/_generated/dataModel";
import { ConvexError } from "convex/values";
import { FileSystemUploadType, uploadAsync } from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED_MIME = [
	"image/jpeg",
	"image/png",
	"image/webp",
	"image/gif",
] as const;

type PickedImage = {
	uri: string;
	mimeType: string;
	sizeBytes: number;
};

export type PickProfileImageResult =
	| { kind: "picked"; image: PickedImage }
	| { kind: "canceled" }
	| { kind: "permission-denied"; previouslyDenied: boolean }
	| { kind: "error"; message: string };

/**
 * Prompt the user to pick a square-ish profile photo from their library.
 * Handles permission requests and basic validation (size + mime type).
 */
export async function pickProfileImage(): Promise<PickProfileImageResult> {
	try {
		const existing = await ImagePicker.getMediaLibraryPermissionsAsync();
		const previouslyDenied =
			existing.status === ImagePicker.PermissionStatus.DENIED;
		const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
		if (!permission.granted) {
			return { kind: "permission-denied", previouslyDenied };
		}

		const result = await ImagePicker.launchImageLibraryAsync({
			mediaTypes: ["images"],
			allowsEditing: true,
			aspect: [1, 1],
			quality: 0.85,
			exif: false,
		});

		if (result.canceled || result.assets.length === 0) {
			return { kind: "canceled" };
		}

		const asset = result.assets[0];
		const mimeType = asset.mimeType ?? guessMimeFromUri(asset.uri);
		if (!ACCEPTED_MIME.includes(mimeType as (typeof ACCEPTED_MIME)[number])) {
			return {
				kind: "error",
				message: "Please pick a JPEG, PNG, WebP, or GIF image.",
			};
		}
		if (asset.fileSize && asset.fileSize > MAX_BYTES) {
			return {
				kind: "error",
				message: "Image must be 5 MB or smaller.",
			};
		}

		return {
			kind: "picked",
			image: {
				uri: asset.uri,
				mimeType,
				sizeBytes: asset.fileSize ?? 0,
			},
		};
	} catch (err) {
		return {
			kind: "error",
			message:
				err instanceof Error ? err.message : "Could not open the image picker.",
		};
	}
}

function guessMimeFromUri(uri: string): string {
	const lower = uri.toLowerCase();
	if (lower.endsWith(".png")) return "image/png";
	if (lower.endsWith(".webp")) return "image/webp";
	if (lower.endsWith(".gif")) return "image/gif";
	return "image/jpeg";
}

/**
 * Upload a picked image to Convex storage and return the resulting storageId.
 *
 * `generateUploadUrl` should be a Convex mutation hook bound at the call site
 * (e.g. `useMutation(api.user.mutations.generateProfilePictureUploadUrl)`).
 */
export async function uploadProfileImage(
	image: PickedImage,
	generateUploadUrl: () => Promise<string>,
): Promise<Id<"_storage">> {
	const uploadUrl = await generateUploadUrl();

	// Use expo-file-system's native uploader. Reading the file via
	// `fetch(file://...).arrayBuffer()` is unreliable on iOS — it can
	// resolve with empty or corrupted bytes, leading to a successful POST
	// that stores a blank image. `uploadAsync` streams from disk in native
	// code with no JS-bridge round trip.
	const uploadResult = await uploadAsync(uploadUrl, image.uri, {
		httpMethod: "POST",
		uploadType: FileSystemUploadType.BINARY_CONTENT,
		headers: { "Content-Type": image.mimeType },
	});

	if (uploadResult.status < 200 || uploadResult.status >= 300) {
		throw new ConvexError({
			code: "UPLOAD_FAILED",
			message: `Upload failed (status ${uploadResult.status}).`,
		});
	}

	let parsed: { storageId?: Id<"_storage"> };
	try {
		parsed = JSON.parse(uploadResult.body) as { storageId?: Id<"_storage"> };
	} catch {
		throw new ConvexError({
			code: "UPLOAD_FAILED",
			message: "Upload response was not valid JSON.",
		});
	}
	if (!parsed.storageId) {
		throw new ConvexError({
			code: "UPLOAD_FAILED",
			message: "Upload response did not include a storage id.",
		});
	}
	return parsed.storageId;
}
