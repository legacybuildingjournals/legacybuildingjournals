import { createFileRoute } from "@tanstack/react-router";

import { DashboardCommunityPage } from "@/features/community/DashboardCommunityPage";

export const Route = createFileRoute("/dashboard/community")({
	component: CommunityRoute,
});

/**
 * Static page, so it skips the `useSkeletonTransition` loader the data-backed
 * dashboard routes use — there is nothing to wait for.
 */
function CommunityRoute() {
	return <DashboardCommunityPage />;
}
