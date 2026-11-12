import { GiftDetailsForm } from "@/components/gift/GiftDetailsForm";
import { GiftOfferDetails } from "@/components/gift/GiftOfferDetails";
import {
	GiftHeroCard,
	GiftHowItWorks,
	giftCardClass,
} from "@/components/gift/GiftPageChrome";

/**
 * Desktop "Gift Subscription" (Figma, Webapp Views): the offer and the
 * recipient form side by side on one page. Phones keep the two-step flow.
 */
export function GiftDesktopCompose({ giftId }: { giftId?: string }) {
	return (
		<div className="grid grid-cols-2 items-start gap-6 lg:gap-8">
			<GiftHeroCard>
				<GiftOfferDetails />
				<div className="mt-6">
					<GiftHowItWorks>
						Recipient would get lifetime subscription access when gift is
						redeemed.
					</GiftHowItWorks>
				</div>
			</GiftHeroCard>

			<GiftDetailsForm
				giftId={giftId}
				idPrefix="gift-desktop"
				footerInside
				renderFields={(content) => (
					<section className={giftCardClass}>
						<h2 className="mb-5 font-semibold text-foreground text-xl">
							Gift Invite
						</h2>
						{content}
					</section>
				)}
			/>
		</div>
	);
}
