import { api } from "@legacy-building/backend/convex/_generated/api";
import { useCurrentUser } from "@legacy-building/ui/hooks/use-current-user";
import { useQuery } from "convex/react";

export function useAdminAccess() {
	const { clerkUser, isSignedIn, isLoading } = useCurrentUser();
	const clerkMetadataRole = clerkUser?.publicMetadata?.role;

	const isCurrentUserAdmin = useQuery(
		api.user.queries.isCurrentUserAdmin,
		isSignedIn ? {} : "skip",
	);

	const isCheckingAdmin = isSignedIn && isCurrentUserAdmin === undefined;

	const isAdmin = isCurrentUserAdmin === true || clerkMetadataRole === "admin";

	return {
		isSignedIn,
		isLoading: isLoading || isCheckingAdmin,
		isAdmin,
	};
}
