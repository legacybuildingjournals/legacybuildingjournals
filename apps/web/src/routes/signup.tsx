import { useAuth } from "@clerk/react";
import { PageLoader } from "@legacy-building/ui/components/page-loader";
import { createFileRoute, Link, Navigate } from "@tanstack/react-router";

import { AuthLayout } from "@/components/auth/auth-layout";
import { GoogleOAuthButton } from "@/components/auth/google-oauth-button";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { signupMetadataFromType } from "@/lib/auth/signup-metadata";
import { ROUTES } from "@/lib/routes";

export const Route = createFileRoute("/signup")({
	component: SignUpPage,
	validateSearch: (search: Record<string, unknown>) => ({
		type: typeof search.type === "string" ? search.type : undefined,
	}),
});

function SignUpPage() {
	const { isLoaded, isSignedIn } = useAuth();
	const { type } = Route.useSearch();
	const signInHref = type
		? `/login?type=${encodeURIComponent(type)}`
		: ROUTES.login;

	if (isLoaded && isSignedIn) {
		return <Navigate to={ROUTES.dashboard} replace />;
	}

	if (!isLoaded) {
		return <PageLoader message="Loading sign up..." />;
	}

	return (
		<AuthLayout>
			<div className="flex flex-col gap-1">
				<h1 className="font-bold font-heading text-[1.75rem] text-foreground leading-tight tracking-tight">
					Create an Account
				</h1>
				<p className="text-muted-foreground text-sm">
					Create your account to start writing your story.
				</p>
			</div>
			<div className="mt-6 flex flex-col gap-4">
				<SignUpForm signupType={type} />
				<div className="relative py-1">
					<div className="absolute inset-0 flex items-center" aria-hidden>
						<span className="w-full border-border border-t" />
					</div>
					<div className="relative flex justify-center font-medium text-muted-foreground text-xs uppercase tracking-[0.14em]">
						<span className="bg-transparent px-3">Or</span>
					</div>
				</div>
				<GoogleOAuthButton
					mode="sign-up"
					unsafeMetadata={signupMetadataFromType(type ?? null)}
				/>
				<p className="text-center text-muted-foreground text-sm">
					Already have an Account?{" "}
					<Link
						to={signInHref}
						className="font-semibold text-primary hover:opacity-80"
					>
						Login
					</Link>
				</p>
			</div>
		</AuthLayout>
	);
}
