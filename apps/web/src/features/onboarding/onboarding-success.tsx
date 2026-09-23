import type {
	AnswerRecord,
	Recipient,
} from "@legacy-building/backend/convex/onboarding/questions";
import { resultFor } from "@legacy-building/backend/convex/onboarding/results";
import { env } from "@legacy-building/env/web";
import { buttonVariants } from "@legacy-building/ui/components/button";
import { assets } from "@legacy-building/ui/lib/brand-journal";
import {
	ANDROID_IS_PUBLIC,
	detectVisitorPlatform,
	storeTargetFor,
} from "@legacy-building/ui/lib/store-links";
import { cn } from "@legacy-building/ui/lib/utils";
import { motion } from "motion/react";
import { useMemo } from "react";

import { ConfettiBurst } from "@/components/onboarding/confetti-burst";
import { OnboardingShell } from "@/components/onboarding/onboarding-shell";
import { ONBOARDING_TOKEN_PARAM } from "@/lib/onboarding/pending-token";
import { isOnboardingHost, ROUTES } from "@/lib/routes";

type OnboardingSuccessProps = {
	recipient: Recipient;
	answers: AnswerRecord;
	token: string;
};

export function OnboardingSuccess({
	recipient,
	answers,
	token,
}: OnboardingSuccessProps) {
	const result = resultFor(recipient, answers);

	// Shared with the invite landing page, so the two can't drift on which
	// store a visitor is sent to.
	const platform = useMemo(() => detectVisitorPlatform(), []);
	const isMobile = platform === "ios" || platform === "android";
	const { url: storeUrl, label: storeLabel } = storeTargetFor(platform);

	// The token travels in the URL because the form may be served from its own
	// hostname, where storage is a different origin than the app's. On that
	// host a relative link would also just re-render this form, so point at the
	// main origin when one is configured.
	const signupPath = `${ROUTES.signup}?${ONBOARDING_TOKEN_PARAM}=${encodeURIComponent(token)}`;
	const origin = isOnboardingHost() ? (env.VITE_APP_ORIGIN ?? "") : "";
	const continueHref = `${origin}${signupPath}`;

	return (
		<OnboardingShell>
			<ConfettiBurst />
			<motion.div
				initial={{ opacity: 0, y: 12 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.25, ease: "easeOut" }}
				// Constrained and centred for the same reason as the in-app result:
				// short prose, not a list, so the full 3/4 column would give it an
				// unreadable line length.
				className="mx-auto flex w-full max-w-[60ch] flex-col gap-6 lg:my-auto"
			>
				{/* See pre-app-onboarding: the bundled logos are white-on-dark marks. */}
				<span className="flex w-fit items-center rounded-xl bg-primary px-3 py-2">
					<img
						src={assets.whiteLogo}
						alt="Legacy Building"
						className="h-6 object-contain"
					/>
				</span>

				<h1 className="font-semibold text-2xl text-foreground leading-tight sm:text-3xl">
					{result.heading}
				</h1>

				<div className="flex flex-col gap-3">
					{result.body.map((paragraph) => (
						<p
							key={paragraph.slice(0, 40)}
							className="text-muted-foreground leading-relaxed"
						>
							{paragraph}
						</p>
					))}
				</div>

				<div className="mt-2 flex flex-col gap-3 rounded-2xl border border-border bg-card p-5">
					<p className="font-medium text-foreground">Ready when you are</p>
					<p className="text-muted-foreground text-sm">
						Create your account and we'll pick up right where you left off — no
						need to answer these again.
					</p>

					{/* On a phone the store is the natural next step, so it leads and
					    the web link becomes the alternative. On desktop the store
					    button would be a dead end, so it isn't offered. */}
					{isMobile ? (
						<a
							href={storeUrl}
							target="_blank"
							rel="noreferrer"
							className={cn(
								buttonVariants({ size: "lg" }),
								"transition-all active:scale-[0.98]",
							)}
						>
							{storeLabel}
						</a>
					) : null}

					<a
						href={continueHref}
						className={cn(
							buttonVariants({
								size: "lg",
								variant: isMobile ? "outline" : "default",
							}),
							"transition-all active:scale-[0.98]",
						)}
					>
						Continue on the web
					</a>

					{platform === "android" && !ANDROID_IS_PUBLIC ? (
						<p className="text-muted-foreground text-xs">
							Android is in testing — join the test first, then install from
							Google Play.
						</p>
					) : null}

					<p className="text-muted-foreground text-xs">
						Signing up in the app? Use the same email address and your answers
						will be waiting.
					</p>
				</div>
			</motion.div>
		</OnboardingShell>
	);
}
