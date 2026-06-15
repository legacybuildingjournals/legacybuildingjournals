import { api } from "@legacy-building/backend/convex/_generated/api";
import { useCurrentUser } from "@legacy-building/ui/hooks/use-current-user";
import { useQuery } from "convex/react";

export function useAdminAccess() {
	const { clerkUser, isSignedIn, isLoading } = useCurrentUser();
	const clerkMetadataRole = clerkUser?.publicMetadata?.role;
	const hasClerkAdminRole = clerkMetadataRole === "admin";

	const isCurrentUserAdmin = useQuery(
		api.user.queries.isCurrentUserAdmin,
		isSignedIn && !hasClerkAdminRole ? {} : "skip",
	);

	const isCheckingAdmin =
		isSignedIn && !hasClerkAdminRole && isCurrentUserAdmin === undefined;

	const isAdmin = isCurrentUserAdmin === true || hasClerkAdminRole;

	return {
		isSignedIn,
		isLoading: isLoading || isCheckingAdmin,
		isAdmin,
	};
}
