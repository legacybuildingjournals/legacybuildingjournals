import { useCurrentUser } from "@legacy-building/ui/hooks/use-current-user";
import {
	Navigate,
	type RouterState,
	useRouterState,
} from "@tanstack/react-router";

import { ROUTES } from "@/lib/routes";

type WelcomeGuardProps = {
	children: React.ReactNode;
};

/** First-time users must watch the welcome video before accessing the dashboard. */
export function WelcomeGuard({ children }: WelcomeGuardProps) {
	const { convexUser } = useCurrentUser();
	const pathname = useRouterState({
		select: (s: RouterState) => s.location.pathname,
	});

	const needsWelcome = convexUser && !convexUser.welcomeCompletedAt;

	if (needsWelcome && pathname !== ROUTES.welcome) {
		return <Navigate to={ROUTES.welcome} replace />;
	}

	return children;
}
