export const PDF_ENTRY_IMAGE_MAX_WIDTH = 515;
export const PDF_ENTRY_IMAGE_MAX_HEIGHT = 360;

export type ImageDimensions = {
	width: number;
	height: number;
};

export function fitPdfImageSize(
	naturalWidth: number,
	naturalHeight: number,
	maxWidth = PDF_ENTRY_IMAGE_MAX_WIDTH,
	maxHeight = PDF_ENTRY_IMAGE_MAX_HEIGHT,
): ImageDimensions {
	if (naturalWidth <= 0 || naturalHeight <= 0) {
		return { width: maxWidth, height: maxHeight };
	}

	const scale = Math.min(1, maxWidth / naturalWidth, maxHeight / naturalHeight);

	return {
		width: Math.max(1, Math.round(naturalWidth * scale)),
		height: Math.max(1, Math.round(naturalHeight * scale)),
	};
}
