import { onboardingAssets } from "@legacy-building/assets";
import { cn } from "@legacy-building/ui/lib/utils";
import type { ReactNode } from "react";

/** White rounded card shared by the intro and completion screens. */
export function OnboardingCard({
	children,
	className,
}: {
	children: ReactNode;
	className?: string;
}) {
	return (
		<section
			className={cn(
				"flex w-full flex-col items-center rounded-[32px] border border-onb-card-border bg-white px-5 py-8 sm:px-[49px] sm:py-[41px]",
				"shadow-[0_20px_45px_-10px_rgba(11,48,42,0.08),0_8px_16px_-6px_rgba(11,48,42,0.04)]",
				className,
			)}
		>
			{children}
		</section>
	);
}

/**
 * Renders a heading that the design hard-breaks across lines. The break only
 * applies from `sm` up: on a phone the same break would strand a word.
 */
export function HeadingLines({ text }: { text: string }) {
	const lines = text.split("\n");
	return (
		<>
			{lines.map((line, index) => (
				<span key={line}>
					{index > 0 ? <br className="hidden sm:inline" /> : null}
					{index > 0 ? <span className="sm:hidden"> </span> : null}
					{line}
				</span>
			))}
		</>
	);
}

/** Heading + short underline accent, as at the top of every card. */
export function CardHeading({ children }: { children: string }) {
	const hasBreak = children.includes("\n");
	return (
		<>
			<h1
				className={cn(
					"text-balance text-center font-extrabold text-[30px] text-onb-ink-strong leading-[36px] tracking-[-0.95px]",
					// Only headings with a designed line break stay on those lines
					// at full size; a single long heading wraps inside the card, so
					// it steps down a size to land on two lines rather than three.
					hasBreak
						? "sm:whitespace-nowrap sm:text-[38px] sm:leading-[44.84px]"
						: "sm:text-[32px] sm:leading-[40px] sm:tracking-[-0.8px]",
				)}
			>
				<HeadingLines text={children} />
			</h1>
			<span
				className="mt-2 mb-5 block h-[2px] w-10 rounded-full bg-onb-rule"
				aria-hidden="true"
			/>
		</>
	);
}

export function CardSubheading({ children }: { children: ReactNode }) {
	return (
		<h2 className="pb-2 text-center font-bold text-[21px] text-onb-teal-deep leading-8 tracking-[-0.6px] sm:text-[24px]">
			{children}
		</h2>
	);
}

/** Primary pill button, optionally the outlined secondary. */
export const PILL_BUTTON =
	"flex w-full max-w-[448px] items-center justify-center gap-2 rounded-full px-6 py-3.5 font-bold font-onb-cta text-[16px] leading-6 transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-onb-teal focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60";

export const PILL_PRIMARY = cn(
	PILL_BUTTON,
	"bg-onb-teal text-white shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-2px_rgba(0,0,0,0.1)] hover:brightness-110",
);

export const PILL_SECONDARY = cn(
	PILL_BUTTON,
	"border border-onb-teal bg-white text-onb-teal hover:bg-onb-callout-bg",
);

/** Lock icon + one-line reassurance under the button. */
export function LockNotice({ children }: { children: ReactNode }) {
	return (
		<p className="flex max-w-[384px] items-start justify-center gap-2 pt-6 text-center text-[11px] text-onb-lock leading-[13.75px]">
			<img
				src={onboardingAssets.lockIcon}
				alt=""
				aria-hidden="true"
				className="mt-px h-4 w-[13px] shrink-0"
			/>
			<span>{children}</span>
		</p>
	);
}

/** Write / Voice / Video pills from the completion screen. */
export function ModePills() {
	const pills = [
		{
			label: "Write",
			bg: "bg-onb-pill-write",
			icon: onboardingAssets.pills.write,
		},
		{
			label: "Voice",
			bg: "bg-onb-pill-voice",
			icon: onboardingAssets.pills.voice,
		},
		{
			label: "Video",
			bg: "bg-onb-pill-video",
			icon: onboardingAssets.pills.video,
		},
	];
	return (
		<ul className="flex w-full max-w-[384px] justify-center gap-4 pb-7">
			{pills.map((pill) => (
				<li
					key={pill.label}
					className="flex min-w-0 flex-1 basis-0 flex-col items-center gap-2"
				>
					<span
						className={cn(
							"flex size-14 items-center justify-center rounded-full shadow-[0_1px_1px_rgba(0,0,0,0.05)]",
							pill.bg,
						)}
					>
						<img src={pill.icon} alt="" aria-hidden="true" className="size-6" />
					</span>
					<span className="font-bold font-onb-cta text-[12px] text-onb-pill-label leading-4">
						{pill.label}
					</span>
				</li>
			))}
		</ul>
	);
}
