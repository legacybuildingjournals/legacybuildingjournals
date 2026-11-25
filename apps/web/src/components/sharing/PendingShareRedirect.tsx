import { useAuth } from "@clerk/react";
import {
	type RouterState,
	useNavigate,
	useRouterState,
} from "@tanstack/react-router";
import { useEffect } from "react";

import { ROUTES } from "@/lib/routes";
import { readPendingShareToken } from "@/lib/sharing/pendingShare";

/** Redirect at most once per page load, so an unaccepted invite can't trap anyone. */
let redirectedThisLoad = false;

/**
 * After signing in or up from a share invite page, Clerk lands the user on
 * the dashboard; this sends them back to the invite to accept it.
 */
export function PendingShareRedirect() {
	const { isLoaded, isSignedIn } = useAuth();
	const navigate = useNavigate();
	const pathname = useRouterState({
		select: (s: RouterState) => s.location.pathname,
	});

	useEffect(() => {
		if (!isLoaded || !isSignedIn) return;
		if (pathname.startsWith(`${ROUTES.shareClaim}/`)) return;
		if (pathname.startsWith(`${ROUTES.giftRedeem}/`)) return;
		if (redirectedThisLoad) return;
		const token = readPendingShareToken();
		if (!token) return;
		redirectedThisLoad = true;
		void navigate({ to: "/share/$token", params: { token }, replace: true });
	}, [isLoaded, isSignedIn, navigate, pathname]);

	return null;
}
