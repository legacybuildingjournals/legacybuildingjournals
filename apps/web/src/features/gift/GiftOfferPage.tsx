import { api } from "@legacy-building/backend/convex/_generated/api";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { BookOpen, Infinity as InfinityIcon, Library } from "lucide-react";

import {
	GiftHero,
	GiftHowItWorks,
	GiftPageChrome,
	giftCardClass,
	giftPrimaryButtonClass,
} from "@/components/gift/GiftPageChrome";
import { Skeleton } from "@/components/journal/ui/skeleton";
import { formatAmount } from "@/lib/billing/plans";
import { ROUTES } from "@/lib/routes";

const BENEFITS = [
	{
		icon: BookOpen,
		title: "Unlimited storytelling",
		body: "Write, record, and preserve meaningful moments.",
	},
	{
		icon: Library,
		title: "A private personal library",
		body: "Keep memories together in one place.",
	},
	{
		icon: InfinityIcon,
		title: "No recurring payments",
		body: "The recipient won't pay for the gifted access.",
	},
] as const;

/** SST-2: "Gift Subscription" screen (Figma). */
export function GiftOfferPage() {
	const navigate = useNavigate();
	const offer = useQuery(api.gifts.queries.getOffer);

	return (
		<GiftPageChrome title="Gift Subscription" backTo={ROUTES.dashboardDesk}>
			<GiftHero />

			<section className={giftCardClass}>
				<p className="font-semibold text-[11px] text-primary uppercase tracking-[0.14em]">
					Lifetime subscription access
				</p>
				<div className="mt-3 flex items-baseline gap-2 border-border border-b pb-4">
					{offer === undefined ? (
						<Skeleton className="h-10 w-24" />
					) : (
						<span className="font-serif text-4xl text-foreground">
							{formatAmount(offer.priceMinor, offer.currency)}
						</span>
					)}
					<span className="text-muted-foreground text-sm">
						one-time payment
					</span>
				</div>
				<ul className="mt-4 flex flex-col gap-4">
					{BENEFITS.map(({ icon: Icon, title, body }) => (
						<li key={title} className="flex items-start gap-3">
							<span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
								<Icon className="size-4" aria-hidden />
							</span>
							<div>
								<p className="font-semibold text-foreground text-sm">{title}</p>
								<p className="text-muted-foreground text-xs md:text-sm">
									{body}
								</p>
							</div>
						</li>
					))}
				</ul>
				<p className="mt-4 text-muted-foreground text-xs">
					Charged in your local currency at checkout.
				</p>
			</section>

			<GiftHowItWorks>
				Recipient would get lifetime subscription access when gift is redeemed.
			</GiftHowItWorks>

			<button
				type="button"
				className={giftPrimaryButtonClass}
				onClick={() => void navigate({ to: ROUTES.dashboardGiftDetails })}
			>
				Enter Recipient Details
			</button>
		</GiftPageChrome>
	);
}
