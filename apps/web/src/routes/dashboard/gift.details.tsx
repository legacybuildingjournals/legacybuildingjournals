import { createFileRoute } from "@tanstack/react-router";

import { GiftDetailsPage } from "@/features/gift/GiftDetailsPage";
import { giftIdSearchSchema } from "@/lib/gift/schemas";

export const Route = createFileRoute("/dashboard/gift/details")({
	validateSearch: giftIdSearchSchema,
	component: GiftDetailsRoute,
});

function GiftDetailsRoute() {
	const { giftId } = Route.useSearch();
	return <GiftDetailsPage giftId={giftId} />;
}
