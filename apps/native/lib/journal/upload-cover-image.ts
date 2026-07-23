import type { Id } from "@legacy-building/backend/convex/_generated/dataModel";

import type { PickProfileImageResult } from "@/lib/account/upload-profile-picture";

import { uploadBinaryToConvex } from "./upload-binary";

/**
 * Reuses the picker shape from the profile-pic flow. Re-export the picker
 * helper from there to avoid duplicating permission + validation logic.
 */
export { pickProfileImage as pickCoverImage } from "@/lib/account/upload-profile-picture";

import { pickProfileImage as pickProfileImageRaw } from "@/lib/account/upload-profile-picture";
export type PickCoverImageResult = PickProfileImageResult;

type PickedImage = {
	uri: string;
	mimeType: string;
	sizeBytes: number;
};

/**
 * Uploads a picked journal cover image to Convex storage using the modern
 * expo-file-system File API via uploadBinaryToConvex.
 */
export async function uploadCoverImage(
	image: PickedImage,
	generateUploadUrl: () => Promise<string>,
): Promise<Id<"_storage">> {
	return uploadBinaryToConvex({
		uri: image.uri,
		mimeType: image.mimeType,
		generateUploadUrl,
	});
}

/**
 * Background images fill the whole journal screen, so they are picked without
 * the square crop that covers and avatars use.
 */
export function pickBackgroundImage() {
	return pickProfileImageRaw({ aspect: null });
}
