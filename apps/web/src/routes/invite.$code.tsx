import { useAuth } from "@clerk/react";
import { api } from "@legacy-building/backend/convex/_generated/api";
import { normalizeInviteCode } from "@legacy-building/backend/convex/referrals/codes";
import { brand } from "@legacy-building/ui/lib/brand-journal";
import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { useEffect, useMemo } from "react";
import { Button } from "@/components/journal/ui/button";
import Loader from "@/components/loader";
import { InviteLandingPage } from "@/features/referrals/InviteLandingPage";
import { storePendingInviteCode } from "@/lib/referrals/inviteCodeStorage";
import { detectVisitorPlatform } from "@/lib/referrals/storeLinks";
import { ROUTES } from "@/lib/routes";

export const Route = createFileRoute("/invite/$code")({
	component: InviteRoute,
});

/**
 * Landing page for a shared invite link.
 *
 * Every invite link points here regardless of which platform shared it — a
 * `legacy-building://` link would be a dead end for anyone without the app, and
 * the sharer can't know what device the recipient will use.
 */
function InviteRoute() {
	const { code: rawCode } = Route.useParams();
	const { isLoaded, isSignedIn } = useAuth();
	const navigate = useNavigate();

	const code = normalizeInviteCode(rawCode);
	const platform = useMemo(() => detectVisitorPlatform(), []);
	const invite = useQuery(api.referrals.queries.getPublicInviteInfo, { code });

	// Stash it immediately: whichever route they take from here, signup claims it.
	useEffect(() => {
		storePendingInviteCode(code);
	}, [code]);

	if (!isLoaded || invite === undefined) return <Loader />;

	// Signed in already: onboarding claims it if they haven't finished welcome,
	// otherwise it's simply too late and the dashboard is the right place.
	if (isSignedIn) {
		return <Navigate to={ROUTES.dashboardDesk} replace />;
	}

	if (!invite.valid) {
		return (
			<main
				className="flex min-h-svh w-full flex-col items-center justify-center gap-5 px-5 text-center"
				style={{ backgroundColor: brand.pageBackground }}
			>
				<h1 className="font-semibold text-2xl text-[#1a1a1a]">
					This invite link isn't valid
				</h1>
				<p className="max-w-[360px] text-[#8a8a8a] text-sm leading-[1.5]">
					The link may have been mistyped or the code no longer exists. You can
					still create an account.
				</p>
				<Button
					type="button"
					onClick={() =>
						void navigate({ to: ROUTES.signup, search: { type: undefined } })
					}
					className="h-12 rounded-full px-8 font-semibold text-sm transition-opacity hover:opacity-95 active:scale-[0.98]"
					style={{ backgroundColor: brand.primary }}
				>
					Create an account
				</Button>
			</main>
		);
	}

	// Desktop can't install the app, so skip the interstitial entirely.
	if (platform === "desktop") {
		return <Navigate to={ROUTES.signup} search={{ type: undefined }} replace />;
	}

	return (
		<InviteLandingPage
			code={code}
			inviterFirstName={invite.inviterFirstName}
			platform={platform}
			onContinueOnWeb={() =>
				void navigate({ to: ROUTES.signup, search: { type: undefined } })
			}
		/>
	);
}
