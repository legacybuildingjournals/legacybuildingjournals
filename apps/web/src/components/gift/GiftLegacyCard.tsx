import { cn } from "@legacy-building/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Gift } from "lucide-react";

import { ROUTES } from "@/lib/routes";

/**
 * Figma paywall card "Give the Gift of a Legacy" → Gift Subscription.
 * Shown on the paywall so people who don't subscribe themselves can still gift.
 */
export function GiftLegacyCard({
	onNavigate,
	className,
}: {
	/** Called before navigating (e.g. to close the dialog hosting the card). */
	onNavigate?: () => void;
	className?: string;
}) {
	return (
		<div
			className={cn(
				"relative flex items-center gap-4 overflow-hidden rounded-2xl bg-primary/10 p-4 text-left",
				className,
			)}
		>
			<div className="min-w-0 flex-1">
				<p className="font-semibold text-foreground text-lg leading-tight">
					Give the Gift of a Legacy
				</p>
				<p className="mt-1 text-muted-foreground text-sm leading-snug">
					Gift someone special to start building their own legacy
				</p>
				<Link
					to={ROUTES.dashboardGift}
					onClick={onNavigate}
					className="mt-3 inline-flex h-9 items-center gap-2 rounded-full bg-primary px-4 font-semibold text-primary-foreground text-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-[0.98]"
				>
					Gift Access
					<ArrowRight className="size-4" aria-hidden />
				</Link>
			</div>
			<span className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-background text-primary shadow-sm">
				<Gift className="size-8" aria-hidden />
			</span>
		</div>
	);
}
