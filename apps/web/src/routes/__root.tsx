import { Toaster } from "@legacy-building/ui/components/sonner";
import { assets } from "@legacy-building/ui/lib/brand-journal";
import {
	createRootRouteWithContext,
	HeadContent,
	Outlet,
	type RouterState,
	useRouterState,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";

import Header from "@/components/header";
import { ThemeProvider } from "@/components/theme-provider";
import { PreAppOnboarding } from "@/features/onboarding/pre-app-onboarding";
import { isAuthPath, isOnboardingHost, ROUTES } from "@/lib/routes";

import "../index.css";

export type RouterAppContext = Record<string, unknown>;

export const Route = createRootRouteWithContext<RouterAppContext>()({
	component: RootComponent,
	head: () => ({
		meta: [
			{
				title: "Legacy Building",
			},
			{
				name: "description",
				content: "Legacy Building is a web application",
			},
		],
		links: [
			{
				rel: "icon",
				href: assets.favicon,
			},
		],
	}),
});

function RootComponent() {
	const pathname = useRouterState({
		select: (s: RouterState) => s.location.pathname,
	});
	const isDashboard = pathname.startsWith("/dashboard");
	const isLegalPage = pathname === "/terms" || pathname === "/privacy";
	const isAuthRoute = isAuthPath(pathname);
	const isWelcome = pathname === ROUTES.welcome;
	const isOnboarding = pathname === ROUTES.preappOnboarding;
	const showMarketingHeader =
		!isDashboard && !isLegalPage && !isAuthRoute && !isWelcome && !isOnboarding;

	// On the dedicated onboarding hostname the app is the form and nothing
	// else, whatever path was requested — see `isOnboardingHost`.
	if (isOnboardingHost()) {
		return (
			<>
				<HeadContent />
				<ThemeProvider
					attribute="class"
					defaultTheme="light"
					forcedTheme="light"
					disableTransitionOnChange
					storageKey="vite-ui-theme"
				>
					<PreAppOnboarding />
					<Toaster />
				</ThemeProvider>
			</>
		);
	}

	return (
		<>
			<HeadContent />
			<ThemeProvider
				attribute="class"
				defaultTheme="dark"
				forcedTheme={
					// `/welcome` hosts the same light, mint onboarding UI as
					// `/preapponboarding`. Left on the dark default it painted the page
					// background black, which showed through below the card.
					isAuthRoute || isDashboard || isOnboarding || isWelcome
						? "light"
						: undefined
				}
				disableTransitionOnChange
				storageKey="vite-ui-theme"
			>
				<div
					className={
						// `h-svh` is a fixed height, so a welcome screen taller than the
						// viewport spilled past it and left the page background showing
						// underneath. The onboarding flow needs to grow instead.
						isDashboard || isLegalPage || isOnboarding || isWelcome
							? "min-h-svh"
							: "grid h-svh grid-rows-[auto_1fr]"
					}
				>
					{showMarketingHeader ? <Header /> : null}
					<Outlet />
				</div>
				<Toaster />
			</ThemeProvider>
			<TanStackRouterDevtools position="bottom-left" />
		</>
	);
}
