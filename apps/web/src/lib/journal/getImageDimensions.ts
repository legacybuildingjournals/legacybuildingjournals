import type { ImageDimensions } from "@/lib/journal/fitPdfImageSize";

export function getImageDimensionsFromDataUrl(
	dataUrl: string,
): Promise<ImageDimensions | null> {
	return new Promise((resolve) => {
		const image = new Image();
		image.onload = () => {
			resolve({
				width: image.naturalWidth,
				height: image.naturalHeight,
			});
		};
		image.onerror = () => resolve(null);
		image.src = dataUrl;
	});
}
