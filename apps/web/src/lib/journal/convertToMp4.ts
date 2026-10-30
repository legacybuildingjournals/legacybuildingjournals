import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

let ffmpegInstance: FFmpeg | null = null;
let loadPromise: Promise<void> | null = null;

async function getFFmpeg(): Promise<FFmpeg> {
	if (!ffmpegInstance) {
		ffmpegInstance = new FFmpeg();
	}

	if (!ffmpegInstance.loaded) {
		if (!loadPromise) {
			loadPromise = (async () => {
				// Use the single-threaded core — no SharedArrayBuffer needed,
				// so COOP/COEP headers are not required and cross-origin
				// resources (e.g. Convex-hosted images) keep working.
				const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm";
				await ffmpegInstance!.load({
					coreURL: await toBlobURL(
						`${baseURL}/ffmpeg-core.js`,
						"text/javascript",
					),
					wasmURL: await toBlobURL(
						`${baseURL}/ffmpeg-core.wasm`,
						"application/wasm",
					),
				});
			})();
		}
		await loadPromise;
	}

	return ffmpegInstance;
}

/**
 * Re-encodes a recorded video to H.264 + AAC in an MP4 container — the only
 * combination iOS Safari plays reliably. Browsers record VP9/Opus (in WebM or
 * even inside MP4), which iOS cannot play from a plain link such as a QR code.
 * Returns the original blob if conversion fails.
 */
export async function transcodeVideoForIos(videoBlob: Blob): Promise<Blob> {
	try {
		const ffmpeg = await getFFmpeg();

		await ffmpeg.writeFile("input", await fetchFile(videoBlob));

		await ffmpeg.exec([
			"-i",
			"input",
			"-c:v",
			"libx264",
			"-preset",
			"veryfast",
			"-pix_fmt",
			"yuv420p",
			"-c:a",
			"aac",
			"-b:a",
			"128k",
			"-movflags",
			"+faststart",
			"output.mp4",
		]);

		const data = await ffmpeg.readFile("output.mp4");
		const safeBytes =
			typeof data === "string"
				? new TextEncoder().encode(data)
				: (data as Uint8Array).slice();

		await ffmpeg.deleteFile("input");
		await ffmpeg.deleteFile("output.mp4");

		return new Blob([safeBytes], { type: "video/mp4" });
	} catch (err) {
		console.error("Video → H.264 conversion failed, keeping original:", err);
		return videoBlob;
	}
}

/**
 * Converts a WebM audio blob to an MP4 (AAC audio) blob using FFmpeg.wasm.
 * Falls back to the original blob if conversion fails.
 */
export async function convertWebmToMp4(webmBlob: Blob): Promise<Blob> {
	try {
		const ffmpeg = await getFFmpeg();

		await ffmpeg.writeFile("input.webm", await fetchFile(webmBlob));

		await ffmpeg.exec([
			"-i",
			"input.webm",
			"-c:a",
			"aac",
			"-b:a",
			"192k",
			"-movflags",
			"+faststart",
			"output.mp4",
		]);

		const data = await ffmpeg.readFile("output.mp4");
		// `Uint8Array.slice()` always returns a new Uint8Array with a plain
		// ArrayBuffer (never SharedArrayBuffer), making it safe for `new Blob()`.
		const safeBytes =
			typeof data === "string"
				? new TextEncoder().encode(data)
				: (data as Uint8Array).slice();
		const mp4Blob = new Blob([safeBytes], { type: "video/mp4" });

		// Clean up
		await ffmpeg.deleteFile("input.webm");
		await ffmpeg.deleteFile("output.mp4");

		return mp4Blob;
	} catch (err) {
		console.error("WebM → MP4 conversion failed, falling back to WebM:", err);
		return webmBlob;
	}
}
