const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.82;

type DrawableImage = ImageBitmap | HTMLImageElement;

async function loadDrawableImage(file: File): Promise<DrawableImage | null> {
	try {
		return await createImageBitmap(file, {
			imageOrientation: "from-image",
			premultiplyAlpha: "none",
			colorSpaceConversion: "none",
		});
	} catch {
		return loadDrawableImageViaElement(file);
	}
}

function loadDrawableImageViaElement(
	file: File,
): Promise<DrawableImage | null> {
	return new Promise((resolve) => {
		const url = URL.createObjectURL(file);
		const img = new Image();

		img.onload = () => {
			URL.revokeObjectURL(url);
			resolve(img);
		};
		img.onerror = () => {
			URL.revokeObjectURL(url);
			resolve(null);
		};

		img.src = url;
	});
}

function readDimensions(source: DrawableImage): {
	width: number;
	height: number;
} {
	if (source instanceof ImageBitmap) {
		return { width: source.width, height: source.height };
	}

	return {
		width: source.naturalWidth,
		height: source.naturalHeight,
	};
}

function disposeDrawable(source: DrawableImage) {
	if (source instanceof ImageBitmap) {
		source.close();
	}
}

function drawDrawable(
	ctx: CanvasRenderingContext2D,
	source: DrawableImage,
	width: number,
	height: number,
) {
	ctx.drawImage(source, 0, 0, width, height);
	disposeDrawable(source);
}

/**
 * Normalize uploads for the web: apply EXIF orientation, resize large photos,
 * and emit JPEG so portrait/landscape images render consistently everywhere.
 */
export async function compressImageFile(file: File): Promise<File> {
	if (!file.type.startsWith("image/") || file.type === "image/gif") {
		return file;
	}

	const source = await loadDrawableImage(file);
	if (!source) {
		return file;
	}

	const { width: sourceWidth, height: sourceHeight } = readDimensions(source);
	if (sourceWidth <= 0 || sourceHeight <= 0) {
		disposeDrawable(source);
		return file;
	}

	const scale = Math.min(
		1,
		MAX_DIMENSION / Math.max(sourceWidth, sourceHeight),
	);
	const width = Math.max(1, Math.round(sourceWidth * scale));
	const height = Math.max(1, Math.round(sourceHeight * scale));

	const canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;

	const ctx = canvas.getContext("2d");
	if (!ctx) {
		disposeDrawable(source);
		return file;
	}

	drawDrawable(ctx, source, width, height);

	const blob = await new Promise<Blob | null>((resolve) => {
		canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY);
	});
	if (!blob) {
		return file;
	}

	const baseName = file.name.replace(/\.[^.]+$/, "") || "image";
	return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
}
