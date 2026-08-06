import * as VideoThumbnails from "expo-video-thumbnails";

import type { PickedEntryImage } from "./pick-entry-image";

/**
 * Grabs a still from a local video file.
 *
 * `timeMs` defaults to the very start, which is what a new video entry uses as
 * its cover until the user picks a different frame. Some encoders have no
 * keyframe at exactly 0, so a failed grab retries slightly later before giving
 * up — a missing cover shouldn't block saving the entry.
 */
export async function generateVideoThumbnail(
	videoUri: string,
	timeMs = 0,
): Promise<PickedEntryImage | null> {
	const attempts = timeMs === 0 ? [0, 100] : [timeMs];

	for (const time of attempts) {
		try {
			const { uri } = await VideoThumbnails.getThumbnailAsync(videoUri, {
				time,
				quality: 0.85,
			});
			return { uri, mimeType: "image/jpeg", sizeBytes: 0 };
		} catch {
			// Try the next offset.
		}
	}

	return null;
}
