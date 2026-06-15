import { PageLoader } from "@legacy-building/ui/components/page-loader";
import { createFileRoute } from "@tanstack/react-router";

import { DashboardLibraryPage } from "@/features/journal/DashboardLibraryPage";
import { useSkeletonTransition } from "@/hooks/use-skeleton-transition";

export const Route = createFileRoute("/dashboard/library")({
	component: LibraryRoute,
});

function LibraryRoute() {
	const showSkeleton = useSkeletonTransition();

	if (showSkeleton) {
		return <PageLoader />;
	}

	return <DashboardLibraryPage />;
}
