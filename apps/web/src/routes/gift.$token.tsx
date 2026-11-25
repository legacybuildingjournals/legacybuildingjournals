import { createFileRoute } from "@tanstack/react-router";

import { GiftRedeemPage } from "@/features/gift/GiftRedeemPage";

/** Public gift redeem page. QR codes and Claim My Gift links always land here. */
export const Route = createFileRoute("/gift/$token")({
	component: GiftRedeemRoute,
});

function GiftRedeemRoute() {
	const { token } = Route.useParams();
	return <GiftRedeemPage token={token} />;
}
