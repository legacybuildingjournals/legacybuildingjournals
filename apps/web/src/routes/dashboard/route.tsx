import { buttonVariants } from "@legacy-building/ui/components/button";
import { PageLoader } from "@legacy-building/ui/components/page-loader";
import { cn } from "@legacy-building/ui/lib/utils";
import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";

import { SuspendedGuard } from "@/components/account/SuspendedGuard";
import { JournalPaywallProvider } from "@/components/billing/JournalPaywallProvider";
import { DashboardUserGate } from "@/components/dashboard/DashboardUserGate";
import { DashboardHeader } from "@/components/journal/dashboard/DashboardHeader";
import { WelcomeGuard } from "@/components/welcome/WelcomeGuard";
import { ROUTES } from "@/lib/routes";

export const Route = createFileRoute("/dashboard")({
	component: DashboardLayout,
});

function DashboardLayout() {
	return (
		<>
			<Authenticated>
				<DashboardUserGate>
					<SuspendedGuard>
						<WelcomeGuard>
							<JournalPaywallProvider>
								<div className="relative flex min-h-svh w-full flex-col bg-white">
									<DashboardHeader />
									<Outlet />
								</div>
							</JournalPaywallProvider>
						</WelcomeGuard>
					</SuspendedGuard>
				</DashboardUserGate>
			</Authenticated>
			<Unauthenticated>
				<div className="flex min-h-[50svh] flex-col items-center justify-center gap-4 px-4">
					<h1 className="font-semibold text-2xl">Sign in required</h1>
					<p className="text-center text-muted-foreground text-sm">
						You need to sign in to view your dashboard.
					</p>
					<Link to={ROUTES.login} className={cn(buttonVariants())}>
						Sign in
					</Link>
				</div>
			</Unauthenticated>
			<AuthLoading>
				<PageLoader />
			</AuthLoading>
		</>
	);
}
