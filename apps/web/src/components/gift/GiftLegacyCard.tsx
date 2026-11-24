import { assets } from "@legacy-building/ui/lib/brand-journal";
import { cn } from "@legacy-building/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { ROUTES } from "@/lib/routes";

/**
 * Figma "Give the Gift of a Legacy" card → Gift Subscription. A pale mint
 * card with the wrapped gift in a soft circle on the right.
 * - `compact` (pricing page, paywall): two-line title, sized for a column.
 * - `wide` (Account): one-line title, a short banner across the page.
 */
export function GiftLegacyCard({
	variant = "compact",
	onNavigate,
	className,
}: {
	variant?: "compact" | "wide";
	/** Called before navigating (e.g. to close the dialog hosting the card). */
	onNavigate?: () => void;
	className?: string;
}) {
	const wide = variant === "wide";
	return (
		<div
			className={cn(
				"relative isolate flex items-center overflow-hidden rounded-3xl bg-background text-left shadow-md",
				wide ? "min-h-[136px] px-5 py-5 sm:px-6" : "min-h-[160px] p-5",
				className,
			)}
		>
			{/* Mint wash and the circle behind the gift. */}
			<span
				aria-hidden
				className="absolute inset-0 -z-10 bg-linear-to-br from-primary/5 via-primary/10 to-primary/15"
			/>
			<span
				aria-hidden
				className={cn(
					"absolute -z-10 rounded-full bg-primary/10",
					wide
						? "-top-16 -right-10 size-56"
						: "top-1/2 -right-12 size-56 -translate-y-1/2 sm:size-64",
				)}
			/>

			<div
				className={cn(
					"relative min-w-0 flex-1",
					wide ? "pr-24 sm:pr-32" : "pr-28 sm:pr-36",
				)}
			>
				<p
					className={cn(
						"font-bold text-foreground leading-tight",
						wide ? "text-lg sm:text-xl" : "max-w-[12ch] text-xl",
					)}
				>
					Give the Gift of a Legacy
				</p>
				<p className="mt-1.5 max-w-[34ch] text-foreground/75 text-sm leading-snug">
					Gift someone special to start building their own legacy
				</p>
				<Link
					to={ROUTES.dashboardGift}
					onClick={onNavigate}
					className={cn(
						"mt-4 inline-flex h-11 items-center justify-between gap-6 rounded-full bg-primary px-5 font-semibold text-primary-foreground text-sm shadow-sm",
						"transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-[0.98]",
						wide && "sm:min-w-[160px]",
					)}
				>
					Gift Access
					<ArrowRight className="size-4" aria-hidden />
				</Link>
			</div>

			<img
				src={assets.giftBox}
				alt=""
				aria-hidden
				width={182}
				height={183}
				className={cn(
					"pointer-events-none absolute select-none object-contain",
					wide
						? "top-1 right-2 size-24 sm:right-4 sm:size-28"
						: "top-1/2 right-2 size-28 -translate-y-1/2 sm:right-4 sm:size-36",
				)}
			/>
		</div>
	);
}
