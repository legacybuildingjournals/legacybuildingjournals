import { cn } from "@legacy-building/ui/lib/utils";

export {
	accentForMode,
	type EntryFormMode,
	surfaceForMode,
} from "@/components/journal/library/libraryFormStyles";

/** Audio picked from disk. Recorded clips are bounded by the recorder itself. */
export const MAX_AUDIO_BYTES = 50 * 1024 * 1024;

/**
 * One centered column at every breakpoint. Below 720px the 680px cap is
 * inert and the 16px padding provides the gutters.
 */
export const entryColumnClass =
	"mx-auto flex w-full max-w-[680px] flex-col gap-6 px-4 pb-8";

export const entryFieldStack = "flex w-full min-w-0 flex-col gap-1.5";

export const entryLabelClass =
	"font-medium text-[#1a1a1a] text-sm leading-[1.4]";

/** The "(optional)" half of a label, tinted to the mode accent by the caller. */
export const entryOptionalClass = "font-normal";

export const entryCaptionClass =
	"mt-2 text-center text-[#6c757d] text-sm leading-5";

export const entryErrorTextClass = "text-[#b0200c] text-sm";

export function entryInputClass(invalid: boolean) {
	return cn(
		"h-12 max-h-12 w-full min-w-0 rounded-[10px] border bg-white px-4 font-normal text-[#1a1a1a] text-sm shadow-none focus-visible:ring-0",
		invalid
			? "border-[#b0200c] focus-visible:border-[#b0200c]"
			: "border-[#e9ecef] focus-visible:border-[#c7c7c7]",
	);
}

/**
 * Dashed cover drop zone. Border color and wash are applied inline by the
 * caller from the mode accent; this only carries the geometry and state.
 */
export function coverDropzoneClass(invalid: boolean, dragging: boolean) {
	return cn(
		"flex w-full flex-col items-center rounded-[12px] border-2 border-dashed px-6 py-7 transition-colors",
		invalid && "border-[#b0200c]",
		dragging && "border-solid",
	);
}

export const coverPreviewFrameClass =
	"relative aspect-[16/10] w-full overflow-hidden rounded-[12px]";

export const coverEditPillClass =
	"absolute top-3 right-3 z-10 flex h-9 cursor-pointer items-center gap-1.5 rounded-full bg-white px-3.5 font-semibold text-[#212529] text-sm shadow-[0_2px_8px_rgba(0,0,0,0.15)] transition-opacity hover:opacity-90";

export const captureCardClass =
	"flex w-full flex-col items-center rounded-[12px] border p-6";

export const captureIconCircleClass =
	"mb-3 flex size-12 items-center justify-center rounded-full";

export const captureTitleClass =
	"font-semibold text-[#212529] text-base leading-6";

export const captureCopyClass =
	"mt-1.5 max-w-[240px] text-center text-[#6c757d] text-sm leading-5";

export const captureFilledButtonClass =
	"mt-5 h-11 w-full rounded-[8px] font-semibold text-sm text-white shadow-none transition-opacity hover:opacity-95 active:scale-[0.99]";

export const captureOutlineButtonClass =
	"h-11 w-full rounded-[8px] bg-white font-semibold text-sm shadow-none transition-colors hover:bg-white hover:opacity-90 active:scale-[0.99]";

export const captureOrRowClass = "flex w-full items-center gap-3 py-3";

export const captureOrRuleClass = "h-px flex-1 bg-[#e9ecef]";

export const captureOrTextClass = "text-[#6c757d] text-xs";

export const infoCardClass =
	"flex w-full items-start gap-3 rounded-[12px] border p-4";

export const infoIconCircleClass =
	"flex size-10 shrink-0 items-center justify-center rounded-full";

export const infoTitleClass =
	"font-semibold text-[#212529] text-base leading-6";

export const infoCopyClass = "text-[#6c757d] text-sm leading-5";

/** Square "Upload a file" tile used for the optional entry cover. */
export const uploadTileClass =
	"relative flex aspect-square w-full max-w-[370px] cursor-pointer flex-col items-center justify-center gap-3 overflow-hidden rounded-[10px] border bg-white transition-colors";

export const uploadTileLabelClass = "font-medium text-sm leading-5";
