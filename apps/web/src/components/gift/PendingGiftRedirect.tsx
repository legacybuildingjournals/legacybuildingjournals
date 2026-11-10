import { useAuth } from "@clerk/react";
import {
	type RouterState,
	useNavigate,
	useRouterState,
} from "@tanstack/react-router";
import { useEffect } from "react";

import { readPendingGiftToken } from "@/lib/gift/pendingGift";
import { ROUTES } from "@/lib/routes";

/**
 * After signing in or up from a gift page (password, email code, or Google),
 * Clerk lands the user on the dashboard. This sends them back to the gift so
 * they can claim it before anything else, including the welcome quiz.
 */
/** Redirect at most once per page load, so an unclaimed gift can't trap the user. */
let redirectedThisLoad = false;

export function PendingGiftRedirect() {
	const { isLoaded, isSignedIn } = useAuth();
	const navigate = useNavigate();
	const pathname = useRouterState({
		select: (s: RouterState) => s.location.pathname,
	});

	useEffect(() => {
		if (!isLoaded || !isSignedIn) return;
		if (pathname.startsWith(`${ROUTES.giftRedeem}/`)) return;
		if (redirectedThisLoad) return;
		const token = readPendingGiftToken();
		if (!token) return;
		redirectedThisLoad = true;
		void navigate({
			to: "/gift/$token",
			params: { token },
			replace: true,
		});
	}, [isLoaded, isSignedIn, navigate, pathname]);

	return null;
}
