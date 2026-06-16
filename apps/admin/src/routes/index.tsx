import { createFileRoute, Navigate } from "@tanstack/react-router";

import Loader from "@/components/loader";
import { useAdminAccess } from "@/hooks/use-admin-access";
import { ROUTES } from "@/lib/routes";

export const Route = createFileRoute("/")({
	component: IndexRedirect,
});

function IndexRedirect() {
	const { isSignedIn, isLoading, isAdmin } = useAdminAccess();

	if (isLoading) {
		return <Loader />;
	}

	if (isSignedIn && isAdmin) {
		return <Navigate to={ROUTES.dashboard} replace />;
	}

	return <Navigate to={ROUTES.signIn} replace />;
}
