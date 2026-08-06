import { File } from "expo-file-system";
import * as ImagePicker from "expo-image-picker";

import { isCameraAvailable, NO_CAMERA_MESSAGE } from "./camera-availability";

/**
 * Videos are uploaded whole to Convex storage, so the cap is about upload time
 * and the reader's patience rather than a hard platform limit.
 */
const MAX_BYTES = 200 * 1024 * 1024;
export const MAX_VIDEO_SECONDS = 300;

const ACCEPTED_MIME = ["video/mp4", "video/quicktime", "video/x-m4v"] as const;

export type PickedEntryVideo = {
	uri: string;
	mimeType: string;
	sizeBytes: number;
	durationMs: number;
};

export type PickEntryVideoResult =
	| { kind: "picked"; video: PickedEntryVideo }
	| { kind: "canceled" }
	| {
			kind: "permission-denied";
			reason: "camera" | "library";
			previouslyDenied: boolean;
	  }
	| { kind: "error"; message: string };

function guessMimeFromUri(uri: string): string {
	const lower = uri.toLowerCase();
	if (lower.endsWith(".mov")) return "video/quicktime";
	if (lower.endsWith(".m4v")) return "video/x-m4v";
	return "video/mp4";
}

async function resolveSizeBytes(
	uri: string,
	reportedSize?: number,
): Promise<number | null> {
	if (reportedSize != null && reportedSize > 0) return reportedSize;

	const file = new File(uri);
	if (!file.exists || file.size <= 0) return null;
	return file.size;
}

async function processResult(
	result: ImagePicker.ImagePickerResult,
): Promise<PickEntryVideoResult> {
	if (result.canceled || result.assets.length === 0) {
		return { kind: "canceled" };
	}

	const asset = result.assets[0];
	if (!asset) return { kind: "canceled" };

	const mimeType = asset.mimeType ?? guessMimeFromUri(asset.uri);
	if (!ACCEPTED_MIME.includes(mimeType as (typeof ACCEPTED_MIME)[number])) {
		return {
			kind: "error",
			message: "Please choose an MP4 or MOV video.",
		};
	}

	const sizeBytes = await resolveSizeBytes(asset.uri, asset.fileSize);
	if (sizeBytes === null) {
		return {
			kind: "error",
			message: "Could not read that video. Please try another one.",
		};
	}
	if (sizeBytes > MAX_BYTES) {
		return { kind: "error", message: "Video must be 200 MB or smaller." };
	}

	// The picker reports duration in ms, but not on every platform/source.
	const durationMs = asset.duration ?? 0;
	if (durationMs > MAX_VIDEO_SECONDS * 1000) {
		return {
			kind: "error",
			message: `Video must be ${MAX_VIDEO_SECONDS / 60} minutes or shorter.`,
		};
	}

	return {
		kind: "picked",
		video: { uri: asset.uri, mimeType, sizeBytes, durationMs },
	};
}

/** "Record Video" flow. */
export async function recordEntryVideo(): Promise<PickEntryVideoResult> {
	if (!isCameraAvailable()) {
		return { kind: "error", message: NO_CAMERA_MESSAGE };
	}

	const existing = await ImagePicker.getCameraPermissionsAsync();
	const previouslyDenied =
		existing.status === ImagePicker.PermissionStatus.DENIED;
	const permission = await ImagePicker.requestCameraPermissionsAsync();
	if (!permission.granted) {
		return { kind: "permission-denied", reason: "camera", previouslyDenied };
	}

	try {
		const result = await ImagePicker.launchCameraAsync({
			mediaTypes: ["videos"],
			allowsEditing: false,
			videoMaxDuration: MAX_VIDEO_SECONDS,
			quality: 0.85,
			// Opens on the rear lens; the OS camera UI keeps its own flip control,
			// so front/back stays available once recording starts.
			cameraType: ImagePicker.CameraType.back,
		});
		return await processResult(result);
	} catch (err) {
		return {
			kind: "error",
			message: err instanceof Error ? err.message : "Could not open camera.",
		};
	}
}

/** "Choose From Gallery" flow. */
export async function pickEntryVideoFromLibrary(): Promise<PickEntryVideoResult> {
	const existing = await ImagePicker.getMediaLibraryPermissionsAsync();
	const previouslyDenied =
		existing.status === ImagePicker.PermissionStatus.DENIED;
	const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
	if (!permission.granted) {
		return { kind: "permission-denied", reason: "library", previouslyDenied };
	}

	try {
		const result = await ImagePicker.launchImageLibraryAsync({
			mediaTypes: ["videos"],
			allowsEditing: false,
			quality: 0.85,
		});
		return await processResult(result);
	} catch (err) {
		return {
			kind: "error",
			message: err instanceof Error ? err.message : "Could not open library.",
		};
	}
}
