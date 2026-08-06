/**
 * Grabs the first frame of a video as a JPEG file, used as the cover image
 * fallback when a video entry is saved without one.
 */
export async function extractVideoFirstFrame(
	source: File | string,
): Promise<File | null> {
	return new Promise((resolve) => {
		const video = document.createElement("video");
		video.preload = "metadata";
		video.muted = true;
		video.playsInline = true;
		if (typeof source === "string") {
			video.crossOrigin = "anonymous";
		}

		const objectUrl =
			typeof source === "string" ? null : URL.createObjectURL(source);
		video.src = objectUrl ?? source;

		const cleanup = () => {
			if (objectUrl) URL.revokeObjectURL(objectUrl);
		};

		const finish = (file: File | null) => {
			cleanup();
			resolve(file);
		};

		video.onloadeddata = () => {
			// A hair after 0 — some codecs render a black frame at the exact start.
			try {
				video.currentTime = Math.min(0.1, video.duration || 0);
			} catch {
				finish(null);
			}
		};

		video.onseeked = () => {
			const canvas = document.createElement("canvas");
			canvas.width = video.videoWidth;
			canvas.height = video.videoHeight;
			const ctx = canvas.getContext("2d");
			if (!ctx || canvas.width === 0 || canvas.height === 0) {
				finish(null);
				return;
			}
			try {
				ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
			} catch {
				finish(null);
				return;
			}
			canvas.toBlob(
				(blob) => {
					if (!blob) {
						finish(null);
						return;
					}
					finish(
						new File([blob], `cover-${Date.now()}.jpg`, {
							type: "image/jpeg",
						}),
					);
				},
				"image/jpeg",
				0.85,
			);
		};

		video.onerror = () => finish(null);
	});
}
