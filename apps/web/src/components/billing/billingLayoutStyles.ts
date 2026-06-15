import { cn } from "@legacy-building/ui/lib/utils";

/** Shared outer padding for billing management pages (active, compare, checkout). */
export const billingPageShellClass =
	"mt-20 flex flex-1 flex-col px-3 py-6 sm:px-4 sm:py-8 md:px-10 md:py-10";

/** Subscribe / paywall page content shell on the teal background. */
export const billingSubscribeShellClass =
	"mx-auto mt-20 flex w-full max-w-[900px] flex-1 flex-col px-3 py-6 sm:px-5 sm:py-8 md:px-6 md:py-10";

export const billingPageTitleClass =
	"font-semibold text-[clamp(1.375rem,5vw,1.875rem)] leading-tight";

export const billingPageSubtitleClass =
	"text-muted-foreground text-sm leading-relaxed sm:text-base";

export const billingHeaderActionClass =
	"h-11 w-full whitespace-normal sm:h-10 sm:w-auto sm:shrink-0 sm:whitespace-nowrap";

export const billingCardPaddingClass = "p-4 sm:p-5 md:p-6 lg:p-8";
