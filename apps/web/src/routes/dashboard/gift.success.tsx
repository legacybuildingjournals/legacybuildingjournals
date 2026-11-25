import { createFileRoute } from "@tanstack/react-router";

import { GiftSuccessPage } from "@/features/gift/GiftSuccessPage";
import { giftSuccessSearchSchema } from "@/lib/gift/schemas";

export const Route = createFileRoute("/dashboard/gift/success")({
	validateSearch: giftSuccessSearchSchema,
	component: GiftSuccessRoute,
});

function GiftSuccessRoute() {
	const { giftId, session_id } = Route.useSearch();
	return <GiftSuccessPage giftId={giftId} sessionId={session_id} />;
}
