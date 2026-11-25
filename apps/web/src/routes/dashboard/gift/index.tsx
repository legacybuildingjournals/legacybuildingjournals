import { createFileRoute } from "@tanstack/react-router";

import { GiftOfferPage } from "@/features/gift/GiftOfferPage";

export const Route = createFileRoute("/dashboard/gift/")({
	component: GiftOfferPage,
});
