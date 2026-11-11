import { cn } from "@legacy-building/ui/lib/utils";

export const accountPageClass =
	"mx-auto flex w-full max-w-[1100px] flex-col gap-8";

export const accountSectionTitleClass =
	"font-semibold text-foreground text-xl sm:text-2xl";

export const accountSectionSubtitleClass =
	"text-muted-foreground text-sm sm:text-base";

export const accountCardClass =
	"rounded-2xl border border-primary/20 bg-primary/5 p-5 shadow-sm sm:p-6";

export const accountPersonalInfoCardClass =
	"rounded-2xl border border-[#d4eaea] bg-[#eff8f8] p-5 shadow-sm sm:p-6";

export const accountPersonalInfoDividerClass =
	"border-0 border-t border-[#d9e8e8]";

export const accountLabelClass =
	"font-normal text-foreground text-sm leading-[1.4]";

export const accountInputClass = cn(
	"h-11 w-full min-w-0 rounded-xl border border-[#e0e0e0] bg-white px-3 font-normal text-foreground text-sm shadow-none",
	"focus-visible:border-primary focus-visible:ring-0 disabled:cursor-default disabled:bg-white disabled:text-foreground disabled:opacity-100",
);

export const accountPersonalInfoEditButtonClass =
	"inline-flex size-5 shrink-0 items-center justify-center text-primary transition-colors hover:text-primary/80";

export const accountPrimaryButtonClass =
	"inline-flex h-11 shrink-0 items-center justify-center rounded-xl bg-[#69b1b1] px-6 font-semibold text-sm text-white shadow-none hover:bg-[#5da3a3] disabled:opacity-60";

export const accountSecondaryButtonClass =
	"inline-flex h-10 items-center justify-center rounded-xl border border-border bg-card px-5 font-medium text-muted-foreground text-sm shadow-sm hover:bg-muted";

export const accountDangerZoneBodyClass =
	"rounded-2xl border border-destructive/30 bg-card px-5 py-5 shadow-sm sm:px-6 sm:py-6";

export const accountDangerButtonClass =
	"h-10 rounded-xl border border-destructive/25 px-5 font-medium shadow-none";

export const accountWarningBoxClass =
	"rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900 text-sm leading-relaxed dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200";

export const accountBillingBannerClass =
	"flex items-start gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 sm:px-5 sm:py-4";

export const accountBillingBannerDismissClass =
	"inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-[color,background-color,transform] hover:bg-muted active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2";

export const accountBillingBannerLinkClass =
	"ml-1 font-medium text-primary transition-colors hover:underline active:scale-[0.98] active:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-1 rounded-sm";
