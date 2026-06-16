import { Toaster } from "@legacy-building/ui/components/sonner";
import { assets } from "@legacy-building/ui/lib/brand-journal";
import {
	createRootRouteWithContext,
	HeadContent,
	Outlet,
	useRouterState,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";

import { ThemeProvider } from "@/components/theme-provider";
import { adminPageClass } from "@/lib/admin-theme";
import { isAdminAuthPath } from "@/lib/auth-routes";

import "../index.css";

export type RouterAppContext = Record<string, unknown>;

export const Route = createRootRouteWithContext<RouterAppContext>()({
	component: RootComponent,
	head: () => ({
		meta: [
			{
				title: "Legacy Building Admin",
			},
			{
				name: "description",
				content: "Legacy Building admin application",
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
	const pathname = useRouterState({ select: (s) => s.location.pathname });
	const isAuthRoute = isAdminAuthPath(pathname);

	return (
		<>
			<HeadContent />
			<ThemeProvider
				defaultTheme="light"
				forcedTheme={isAuthRoute ? "light" : undefined}
				storageKey="admin-ui-theme"
			>
				<div
					className={`min-h-svh text-foreground ${isAuthRoute ? "bg-[#ebf6f6]" : adminPageClass}`}
				>
					<Outlet />
				</div>
				<Toaster />
			</ThemeProvider>
			<TanStackRouterDevtools position="bottom-left" />
		</>
	);
}
