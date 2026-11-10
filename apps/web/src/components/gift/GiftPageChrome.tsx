import { assets } from "@legacy-building/ui/lib/brand-journal";
import { cn } from "@legacy-building/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, Send } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Page frame for the gift screens. Mobile web mirrors the Figma native
 * screens (teal title bar with Back); desktop follows the billing pages'
 * back-link + heading convention.
 */
export function GiftPageChrome({
	title,
	backTo,
	backLabel = "Back",
	children,
}: {
	title: string;
	backTo: string;
	backLabel?: string;
	children: ReactNode;
}) {
	return (
		<div className="relative flex min-h-svh w-full flex-col bg-secondary">
			<div className="mt-20 flex flex-1 flex-col">
				<div className="sticky top-20 z-10 flex items-center gap-2 bg-primary px-4 py-3 text-primary-foreground md:hidden">
					<Link
						to={backTo}
						className="inline-flex items-center gap-1 rounded-md text-sm transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground/60 active:scale-[0.98]"
					>
						<ChevronLeft className="size-5" aria-hidden />
						{backLabel}
					</Link>
					<h1 className="font-semibold text-base">{title}</h1>
				</div>
				<div className="mx-auto flex w-full max-w-[560px] flex-col gap-4 px-4 py-4 md:max-w-[640px] md:gap-6 md:px-6 md:py-10">
					<header className="hidden flex-col gap-2 md:flex">
						<Link
							to={backTo}
							className="w-fit rounded-sm text-primary text-sm transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-[0.98]"
						>
							← {backLabel}
						</Link>
						<h1 className="font-semibold text-3xl text-foreground">{title}</h1>
					</header>
					{children}
				</div>
			</div>
		</div>
	);
}

const HERO = {
	gift: {
		src: assets.giftHero,
		alt: "Gift Lifetime Access. Give someone you love a lifetime of stories.",
		aspect: "aspect-[370/272]",
	},
	redeem: {
		src: assets.giftRedeemHero,
		alt: "Legacy Building. A Gift for Your Story.",
		aspect: "aspect-[768/420]",
	},
} as const;

/**
 * Figma hero artwork. The headline is part of the image (exported by the
 * designer), so it's only repeated in the alt text.
 */
export function GiftHero({
	variant = "gift",
}: {
	variant?: keyof typeof HERO;
}) {
	const hero = HERO[variant];
	return (
		<div
			className={cn(
				"overflow-hidden rounded-2xl bg-secondary shadow-sm",
				hero.aspect,
			)}
		>
			<img
				src={hero.src}
				alt={hero.alt}
				className="size-full object-cover"
				loading="eager"
				decoding="async"
			/>
		</div>
	);
}

/** The light-teal "How it works?" box used on both gift screens. */
export function GiftHowItWorks({ children }: { children: ReactNode }) {
	return (
		<div className="flex items-start gap-3 rounded-2xl bg-primary/10 p-4">
			<span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-background text-primary">
				<Send className="size-4" aria-hidden />
			</span>
			<div className="flex flex-col gap-0.5">
				<p className="font-semibold text-foreground text-sm">How it works?</p>
				<p className="text-muted-foreground text-xs leading-relaxed md:text-sm">
					{children}
				</p>
			</div>
		</div>
	);
}

export const giftPrimaryButtonClass = cn(
	"flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-6 font-semibold text-primary-foreground text-sm shadow-sm",
	"transition-colors hover:bg-primary/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60",
	"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
);

export const giftCardClass =
	"rounded-2xl border border-border bg-card p-5 shadow-sm md:p-6";
