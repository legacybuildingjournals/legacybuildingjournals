import { useAuth } from "@clerk/react";
import { PageLoader } from "@legacy-building/ui/components/page-loader";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";

import { AdminForbidden } from "@/components/admin-forbidden";
import { AdminSignInForm } from "@/components/auth/sign-in-form";
import { useAdminAccess } from "@/hooks/use-admin-access";
import { adminPageClass } from "@/lib/admin-theme";
import { ADMIN_APP_BRAND } from "@/lib/nav";
import { ROUTES } from "@/lib/routes";

export const Route = createFileRoute("/sign-in")({
	component: SignInPage,
});

function SignInPage() {
	const { isLoaded } = useAuth();
	const { isSignedIn, isLoading, isAdmin } = useAdminAccess();

	if (!isLoaded) {
		return <PageLoader message="Checking session…" />;
	}

	if (isSignedIn && isAdmin && !isLoading) {
		return <Navigate to={ROUTES.dashboard} replace />;
	}

	if (isSignedIn && !isAdmin && !isLoading) {
		return <AdminForbidden />;
	}

	return (
		<div
			className={`relative flex min-h-svh flex-col text-foreground ${adminPageClass}`}
		>
			<div className="flex flex-1 flex-col items-center justify-center px-5 py-10 sm:px-8">
				<div className="fade-in-50 slide-in-from-bottom-3 w-full max-w-md animate-in duration-500">
					<header className="mb-8 flex shrink-0 items-center gap-3">
						<span
							aria-hidden
							className="flex size-10 items-center justify-center rounded-full border border-border bg-popover text-foreground shadow-sm"
						>
							<ShieldCheck className="size-5" strokeWidth={1.75} />
						</span>
						<span className="font-heading font-semibold text-foreground text-lg tracking-tight">
							{ADMIN_APP_BRAND.name}
						</span>
					</header>

					<main className="flex w-full flex-col">
						<h1 className="font-heading font-semibold text-3xl text-foreground leading-tight tracking-tight sm:text-4xl">
							Admin sign in
						</h1>
						<p className="mt-3 text-base text-muted-foreground leading-relaxed">
							Use your admin email and password to continue.
						</p>

						<div className="mt-8">
							{isLoaded ? (
								<AdminSignInForm />
							) : (
								<PageLoader
									overlay={false}
									className="min-h-[280px]"
									size={220}
								/>
							)}
						</div>

						<p className="mt-8 text-center text-muted-foreground text-xs leading-relaxed">
							Restricted access. If you don&apos;t have an account, contact your
							administrator.
						</p>
					</main>
				</div>
			</div>
		</div>
	);
}
