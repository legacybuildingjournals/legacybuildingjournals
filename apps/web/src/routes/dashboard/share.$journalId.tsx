import type { Id } from "@legacy-building/backend/convex/_generated/dataModel";
import { createFileRoute } from "@tanstack/react-router";

import { ShareJournalPage } from "@/features/sharing/ShareJournalPage";

export const Route = createFileRoute("/dashboard/share/$journalId")({
	component: ShareJournalRoute,
});

function ShareJournalRoute() {
	const { journalId } = Route.useParams();
	return <ShareJournalPage journalId={journalId as Id<"journals">} />;
}
