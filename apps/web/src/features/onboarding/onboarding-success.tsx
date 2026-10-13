import type {
	AnswerRecord,
	Recipient,
} from "@legacy-building/backend/convex/onboarding/questions";
import {
	detectVisitorPlatform,
	storeTargetFor,
} from "@legacy-building/ui/lib/store-links";
import { useMemo } from "react";
import {
	PILL_PRIMARY,
	PILL_SECONDARY,
} from "@/components/onboarding/onboarding-card";
import { OnboardingCompletion } from "@/components/onboarding/onboarding-completion";
import { ONBOARDING_TOKEN_PARAM } from "@/lib/onboarding/pending-token";
import { appOriginForOnboardingHost, ROUTES } from "@/lib/routes";

type OnboardingSuccessProps = {
	recipient: Recipient;
	answers: AnswerRecord;
	token: string;
};

/**
 * Completion screen for the external (pre-account) form. There is no account to
 * "start building" in yet, so instead of the in-app CTA the visitor chooses where
 * to continue: the store for their phone, or the web app.
 */
export function OnboardingSuccess({
	recipient,
	answers,
	token,
}: OnboardingSuccessProps) {
	// Shared with the invite landing page, so the two can't drift on which
	// store a visitor is sent to.
	const platform = useMemo(() => detectVisitorPlatform(), []);
	const isMobile = platform === "ios" || platform === "android";
	const storeUrl = storeTargetFor(platform).url;
	const storeLabel =
		platform === "android" ? "Continue with Android" : "Continue with iOS";

	// The token travels in the URL because the form may be served from its own
	// hostname, where storage is a different origin than the app's. On that host
	// a relative link would just re-render this form, so the origin is made
	// absolute — see `appOriginForOnboardingHost`.
	const signupPath = `${ROUTES.signup}?${ONBOARDING_TOKEN_PARAM}=${encodeURIComponent(token)}`;
	const continueHref = `${appOriginForOnboardingHost()}${signupPath}`;

	return (
		<OnboardingCompletion
			recipient={recipient}
			answers={answers}
			actions={
				<>
					{/* On a phone the store is the natural next step, so it leads and
					    the web link becomes the alternative. On desktop a store button
					    would be a dead end, so it isn't offered. */}
					{isMobile ? (
						<a
							href={storeUrl}
							target="_blank"
							rel="noreferrer"
							className={PILL_PRIMARY}
						>
							{storeLabel}
						</a>
					) : null}
					<a
						href={continueHref}
						className={isMobile ? PILL_SECONDARY : PILL_PRIMARY}
					>
						Continue with Web
					</a>
				</>
			}
		/>
	);
}
