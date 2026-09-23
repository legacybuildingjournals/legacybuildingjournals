import { ClerkProvider, useAuth } from "@clerk/react";
import { env } from "@legacy-building/env/web";
import { AppProviders } from "@legacy-building/ui/components/app-providers";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import ReactDOM from "react-dom/client";

import Loader from "./components/loader";
import { captureOnboardingToken } from "./lib/onboarding/pending-token";
import { routeTree } from "./routeTree.gen";

// Read before the router mounts: the external onboarding form hands the token
// over as a URL parameter, and Clerk's redirects would otherwise drop it.
captureOnboardingToken();

const convex = new ConvexReactClient(env.VITE_CONVEX_URL);

const router = createRouter({
	routeTree,
	defaultPreload: "intent",
	scrollRestoration: true,
	defaultPendingComponent: () => <Loader />,
	context: {},
	Wrap: function WrapComponent({ children }: { children: React.ReactNode }) {
		return (
			<ClerkProvider publishableKey={env.VITE_CLERK_PUBLISHABLE_KEY}>
				<ConvexProviderWithClerk client={convex} useAuth={useAuth}>
					<AppProviders>{children}</AppProviders>
				</ConvexProviderWithClerk>
			</ClerkProvider>
		);
	},
});

declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}
}

const rootElement = document.getElementById("app");

if (!rootElement) {
	throw new Error("Root element not found");
}

if (!rootElement.innerHTML) {
	const root = ReactDOM.createRoot(rootElement);
	root.render(<RouterProvider router={router} />);
}
