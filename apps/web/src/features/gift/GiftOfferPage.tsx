import { useNavigate } from "@tanstack/react-router";

import { GiftDesktopCompose } from "@/components/gift/GiftDesktopCompose";
import { GiftOfferDetails } from "@/components/gift/GiftOfferDetails";
import {
	GiftHeroCard,
	GiftHowItWorks,
	GiftPageChrome,
	giftPrimaryButtonClass,
} from "@/components/gift/GiftPageChrome";
import { ROUTES } from "@/lib/routes";

/**
 * SST-2 "Gift Subscription" (Figma). Phones: offer, then "Enter Recipient
 * Details" opens the form screen. Desktop: offer and form on one page.
 */
export function GiftOfferPage() {
	const navigate = useNavigate();

	return (
		<GiftPageChrome
			title="Gift Subscription"
			backTo={ROUTES.dashboardDesk}
			wide
		>
			<div className="flex flex-col gap-4 md:hidden">
				<GiftHeroCard>
					<GiftOfferDetails />
				</GiftHeroCard>

				<GiftHowItWorks>
					Recipient would get lifetime subscription access when gift is
					redeemed.
				</GiftHowItWorks>

				<button
					type="button"
					className={giftPrimaryButtonClass}
					onClick={() => void navigate({ to: ROUTES.dashboardGiftDetails })}
				>
					Enter Recipient Details
				</button>
			</div>

			<div className="hidden md:block">
				<GiftDesktopCompose />
			</div>
		</GiftPageChrome>
	);
}
