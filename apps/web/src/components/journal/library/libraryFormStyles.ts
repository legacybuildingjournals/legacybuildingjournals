import { brand } from "@legacy-building/ui/lib/brand-journal";
import { cn } from "@legacy-building/ui/lib/utils";

/** Bubble add-entry form shell (max-width 1200px, 24px vertical gaps). */
export const bubbleFormShell =
	"mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-4 pb-8 sm:px-6";

export const bubbleFieldStack = "flex w-full min-w-0 flex-col gap-1";

export const bubbleLabelClass =
	"font-normal text-[#1a1a1a] text-sm leading-[1.4]";

export const bubbleRowGap24 = "gap-6";

export function bubbleInputClass(invalid: boolean) {
	return cn(
		"h-11 max-h-11 w-full min-w-0 rounded-[12px] border bg-white px-3 font-normal text-[#1a1a1a] text-sm shadow-none focus-visible:ring-0",
		invalid
			? "border-[#b0200c] focus-visible:border-[#b0200c]"
			: "border-[#c7c7c7] focus-visible:border-[#c7c7c7]",
	);
}

export function bubbleTextareaClass(invalid: boolean) {
	return cn(
		"max-h-[400px] min-h-[160px] w-full resize-none rounded-[12px] border bg-white p-3 font-normal text-[#1a1a1a] text-sm leading-[1.4] shadow-none focus-visible:ring-0",
		invalid
			? "border-[#b0200c] focus-visible:border-[#b0200c]"
			: "border-[#c7c7c7] focus-visible:border-[#c7c7c7]",
	);
}

export function bubbleSelectTriggerClass(invalid: boolean) {
	return cn(
		bubbleInputClass(invalid),
		"!w-full justify-between text-left",
		"data-placeholder:text-[#737373]",
		"[&_[data-slot=select-value]]:min-w-0 [&_[data-slot=select-value]]:flex-1 [&_[data-slot=select-value]]:truncate",
		"[&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-[#737373]",
	);
}

export const bubbleSelectContentClass = cn(
	"z-[1600] w-[var(--radix-select-trigger-width)] min-w-[var(--radix-select-trigger-width)]",
	"overflow-hidden rounded-[12px] border border-[#c7c7c7] bg-white p-1.5",
	"shadow-[0_4px_16px_rgba(0,0,0,0.1)] ring-0",
);

export const bubbleSelectItemClass = cn(
	"cursor-pointer rounded-[10px] py-2.5 pr-9 pl-3 font-normal text-[#1a1a1a] text-sm leading-[1.4]",
	"data-highlighted:bg-[#e6f4f4] data-highlighted:text-[#1a1a1a]",
	"[&_svg]:size-4 [&_svg]:text-[#008080]",
);

export const bubbleDownloadButtonClass =
	"h-11 min-w-[60px] max-w-[200px] flex-1 rounded-[12px] border border-[#008080] bg-white px-5 font-medium text-[#008080] text-sm leading-none shadow-none hover:bg-white hover:opacity-90";

export const bubbleCreateButtonClass =
	"h-11 min-w-[60px] max-w-[200px] flex-1 rounded-[12px] bg-[#008080] px-5 font-medium text-sm text-white leading-none shadow-none hover:opacity-95 disabled:opacity-60";

export function accentForMode(mode: "writing" | "recording" | "video") {
	return mode === "writing" ? brand.primary : brand.alert;
}

/** Centered content width matching Bubble floating group. */
export const entryFormMaxWidthClass = "mx-auto w-full max-w-[1200px]";

/** Aliases for sidebar edit forms. */
export const fieldLabelClass = bubbleLabelClass;
export const fieldInputClass = bubbleInputClass;
export const fieldTextareaClass = bubbleTextareaClass;
export const fieldEntryLogClass = bubbleTextareaClass;

/** Uploaded / preview images scale to fit inside their container without cropping. */
export const uploadedImageFitClass = "max-h-full max-w-full object-contain";

/** Bubble PictureInput tile (265×200px). */
export const bubblePictureInputClass =
	"relative h-[200px] w-[265px] max-w-full self-start overflow-hidden rounded-[12px] border bg-white";

/** Bubble journal cover PictureInput tile (150×150px square). */
export const journalCoverPictureInputClass =
	"relative size-[150px] max-w-full self-start overflow-hidden rounded-[12px] border bg-white";

/** Invisible file input overlaying a Bubble PictureInput container. */
export const bubbleFileInputOverlayClass =
	"absolute top-0 left-0 z-[15] h-full w-full cursor-pointer opacity-0 text-[0px]";

/** Sidebar sticky cover: fill the frame edge-to-edge without letterboxing. */
export const sidebarCoverImageClass = "size-full object-cover";

/** Sidebar sticky cover frame (no padding). */
export const sidebarCoverFrameClass =
	"relative sticky top-0 z-[2] w-full shrink-0 overflow-hidden bg-white";

/** Centered frame for journal entry and cover images. */
export const journalImageFrameClass =
	"flex items-center justify-center overflow-hidden";
