import { z } from "zod";

/** Mirrors `BACK_COVER_*_MAX` in convex/journal/actions.ts (server re-checks). */
export const BACK_COVER_TITLE_MAX = 60;
export const BACK_COVER_MESSAGE_MAX = 500;

/** react-pdf only embeds JPEG and PNG, so the back cover photo must be one. */
export const BACK_COVER_IMAGE_TYPES = ["image/jpeg", "image/png"];

export const backCoverSchema = z.object({
	title: z
		.string()
		.max(
			BACK_COVER_TITLE_MAX,
			`Keep it under ${BACK_COVER_TITLE_MAX} characters.`,
		),
	message: z
		.string()
		.max(
			BACK_COVER_MESSAGE_MAX,
			`Keep it under ${BACK_COVER_MESSAGE_MAX} characters.`,
		),
});

export type BackCoverTextValues = z.infer<typeof backCoverSchema>;

export type BackCoverDesign = BackCoverTextValues & {
	/** Already normalised to JPEG (see `compressImageFile`). */
	photo: File | null;
};

export const EMPTY_BACK_COVER: BackCoverDesign = {
	title: "",
	message: "",
	photo: null,
};

export function isBackCoverEmpty(design: BackCoverDesign): boolean {
	return !design.photo && !design.title.trim() && !design.message.trim();
}
