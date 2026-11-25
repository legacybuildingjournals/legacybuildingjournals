import { GiftDesktopCompose } from "@/components/gift/GiftDesktopCompose";
import { GiftDetailsForm } from "@/components/gift/GiftDetailsForm";
import { GiftHeroCard, GiftPageChrome } from "@/components/gift/GiftPageChrome";
import { ROUTES } from "@/lib/routes";

/**
 * SST-3 "Gift Invite" (Figma). Phones get the form under the gift hero;
 * desktop shows the same combined page as "Gift Subscription", so returning
 * here with `?giftId=` (e.g. after a cancelled payment) restores the draft in
 * place.
 */
export function GiftDetailsPage({ giftId }: { giftId?: string }) {
	return (
		<GiftPageChrome
			title="Gift Invite"
			desktopTitle="Gift Subscription"
			backTo={ROUTES.dashboardGift}
			wide
		>
			<div className="md:hidden">
				<GiftDetailsForm
					giftId={giftId}
					idPrefix="gift-mobile"
					renderFields={(content) => <GiftHeroCard>{content}</GiftHeroCard>}
				/>
			</div>

			<div className="hidden md:block">
				<GiftDesktopCompose giftId={giftId} />
			</div>
		</GiftPageChrome>
	);
}
