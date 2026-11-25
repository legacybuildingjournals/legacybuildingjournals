import { createFileRoute } from "@tanstack/react-router";

import { GiftCheckoutPage } from "@/features/gift/GiftCheckoutPage";
import { giftIdSearchSchema } from "@/lib/gift/schemas";

export const Route = createFileRoute("/dashboard/gift/checkout")({
	validateSearch: giftIdSearchSchema,
	component: GiftCheckoutRoute,
});

function GiftCheckoutRoute() {
	const { giftId } = Route.useSearch();
	return <GiftCheckoutPage giftId={giftId} />;
}
