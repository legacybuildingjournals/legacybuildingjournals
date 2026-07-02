import { File } from "expo-file-system";
import * as ImagePicker from "expo-image-picker";

const MAX_BYTES = 8 * 1024 * 1024;
const ACCEPTED_MIME = [
	"image/jpeg",
	"image/png",
	"image/webp",
	"image/gif",
] as const;

export type PickedEntryImage = {
	uri: string;
	mimeType: string;
	sizeBytes: number;
};

export type PickEntryImageResult =
	| { kind: "picked"; image: PickedEntryImage }
	| { kind: "canceled" }
	| {
			kind: "permission-denied";
			reason: "camera" | "library";
			previouslyDenied: boolean;
	  }
	| { kind: "error"; message: string };

function guessMimeFromUri(uri: string): string {
	const lower = uri.toLowerCase();
	if (lower.endsWith(".png")) return "image/png";
	if (lower.endsWith(".webp")) return "image/webp";
	if (lower.endsWith(".gif")) return "image/gif";
	return "image/jpeg";
}

async function resolveImageSizeBytes(
	uri: string,
	reportedSize?: number,
): Promise<number | null> {
	if (reportedSize != null && reportedSize > 0) {
		return reportedSize;
	}

	const file = new File(uri);
	if (!file.exists || file.size <= 0) {
		return null;
	}
	return file.size;
}

async function processResult(
	result: ImagePicker.ImagePickerResult,
): Promise<PickEntryImageResult> {
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

	const sizeBytes = await resolveImageSizeBytes(asset.uri, asset.fileSize);
	if (sizeBytes === null) {
		return {
			kind: "error",
			message: "Could not determine image size. Please try another image.",
		};
	}
	if (sizeBytes > MAX_BYTES) {
		return { kind: "error", message: "Image must be 8 MB or smaller." };
	}

	return {
		kind: "picked",
		image: {
			uri: asset.uri,
			mimeType,
			sizeBytes,
		},
	};
}

/** "Choose from Library" flow. */
export async function pickEntryImageFromLibrary(): Promise<PickEntryImageResult> {
	const existing = await ImagePicker.getMediaLibraryPermissionsAsync();
	const previouslyDenied =
		existing.status === ImagePicker.PermissionStatus.DENIED;
	const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
	if (!permission.granted) {
		return { kind: "permission-denied", reason: "library", previouslyDenied };
	}
	try {
		const result = await ImagePicker.launchImageLibraryAsync({
			mediaTypes: ["images"],
			allowsEditing: false,
			quality: 0.85,
			exif: false,
		});
		return await processResult(result);
	} catch (err) {
		return {
			kind: "error",
			message: err instanceof Error ? err.message : "Could not open library.",
		};
	}
}

/** "Take Photo" flow. */
export async function pickEntryImageFromCamera(): Promise<PickEntryImageResult> {
	const existing = await ImagePicker.getCameraPermissionsAsync();
	const previouslyDenied =
		existing.status === ImagePicker.PermissionStatus.DENIED;
	const permission = await ImagePicker.requestCameraPermissionsAsync();
	if (!permission.granted) {
		return { kind: "permission-denied", reason: "camera", previouslyDenied };
	}
	try {
		const result = await ImagePicker.launchCameraAsync({
			mediaTypes: ["images"],
			allowsEditing: false,
			quality: 0.85,
			exif: false,
		});
		return await processResult(result);
	} catch (err) {
		return {
			kind: "error",
			message: err instanceof Error ? err.message : "Could not open camera.",
		};
	}
}
