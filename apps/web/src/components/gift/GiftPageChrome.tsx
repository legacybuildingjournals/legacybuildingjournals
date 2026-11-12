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
	desktopTitle,
	backTo,
	backLabel = "Back",
	wide = false,
	children,
}: {
	title: string;
	/** Heading on desktop when it differs from the mobile title bar. */
	desktopTitle?: string;
	backTo: string;
	backLabel?: string;
	/** Desktop two-column layout (offer card beside the recipient form). */
	wide?: boolean;
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
				<div
					className={cn(
						"mx-auto flex w-full max-w-[560px] flex-col gap-4 px-4 py-4 md:gap-6 md:px-6 md:py-10",
						wide ? "md:max-w-[1160px]" : "md:max-w-[640px]",
					)}
				>
					<header className="hidden flex-col gap-2 md:flex">
						<Link
							to={backTo}
							className="w-fit rounded-sm text-primary text-sm transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-[0.98]"
						>
							← {backLabel}
						</Link>
						<h1 className="font-semibold text-3xl text-foreground">
							{desktopTitle ?? title}
						</h1>
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
	joined = false,
}: {
	variant?: keyof typeof HERO;
	/** Top of a card: square bottom edge, no shadow of its own. */
	joined?: boolean;
}) {
	const hero = HERO[variant];
	return (
		<div
			className={cn(
				"overflow-hidden bg-secondary",
				joined ? "rounded-t-2xl" : "rounded-2xl shadow-sm",
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

/**
 * Card whose top is the gift hero (Figma: the artwork and the panel below it
 * are one piece). The panel overlaps the artwork slightly with rounded top
 * corners on phones, and meets it edge to edge on desktop.
 */
export function GiftHeroCard({
	children,
	className,
}: {
	children: ReactNode;
	className?: string;
}) {
	return (
		<section
			className={cn(
				"flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm",
				className,
			)}
		>
			<GiftHero joined />
			<div className="relative -mt-4 flex flex-col rounded-t-2xl bg-card p-5 md:mt-0 md:rounded-none md:p-6">
				{children}
			</div>
		</section>
	);
}

/** Copy for the "How it works?" box next to the recipient form. */
export const GIFT_DETAILS_HOW_IT_WORKS =
	"After purchase, you'll receive a gift card via email, ready to share with your loved one so they can redeem their access.";

export const giftCardClass =
	"rounded-2xl border border-border bg-card p-5 shadow-sm md:p-6";
