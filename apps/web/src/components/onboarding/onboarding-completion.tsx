import { onboardingAssets } from "@legacy-building/assets";
import type {
	AnswerRecord,
	Recipient,
} from "@legacy-building/backend/convex/onboarding/questions";
import {
	COMPLETION_STATIC,
	resultFor,
} from "@legacy-building/backend/convex/onboarding/results";
import { motion } from "motion/react";
import type { ReactNode } from "react";

import { ConfettiBurst } from "./confetti-burst";
import {
	CardHeading,
	CardSubheading,
	LockNotice,
	ModePills,
	OnboardingCard,
} from "./onboarding-card";
import { OnboardingShell, OnboardingTopBar } from "./onboarding-shell";

type OnboardingCompletionProps = {
	recipient: Recipient;
	answers: AnswerRecord;
	/** The buttons under the copy — differs between the in-app and external flows. */
	actions: ReactNode;
};

/**
 * The "You're creating more than a record of …" screen, with the per-recipient
 * illustration and confetti. Layout follows the Figma completion frames.
 */
export function OnboardingCompletion({
	recipient,
	answers,
	actions,
}: OnboardingCompletionProps) {
	const result = resultFor(recipient, answers);

	return (
		<OnboardingShell>
			<ConfettiBurst />
			<OnboardingTopBar />
			<motion.main
				initial={{ opacity: 0, y: 8 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.22, ease: "easeOut" }}
				className="mx-auto grid min-h-[calc(100svh-72px)] w-full max-w-[1128px] content-center items-center gap-8 px-2.5 py-8 sm:min-h-[calc(100svh-88px)] sm:px-12 lg:grid-cols-[minmax(0,554px)_443px] lg:justify-center lg:gap-x-6 lg:py-[46px]"
			>
				<OnboardingCard>
					<CardHeading>{result.heading}</CardHeading>
					<CardSubheading>{COMPLETION_STATIC.subheading}</CardSubheading>
					<p className="max-w-[448px] pb-5 text-center text-[15px] text-onb-muted-warm leading-[24.38px]">
						{result.narrative}
					</p>

					<ModePills />

					<p className="max-w-[384px] text-center text-[13.5px] text-onb-muted-warm leading-[21.94px]">
						{COMPLETION_STATIC.paragraph}
					</p>
					<p className="max-w-[384px] pb-6 text-center text-[13.5px] text-onb-muted-warm leading-[21.94px]">
						<span className="font-bold text-[14.5px] text-onb-pill-label">
							{COMPLETION_STATIC.emphasis}
						</span>{" "}
						{COMPLETION_STATIC.emphasisTail}
					</p>

					<div className="flex w-full flex-col items-center gap-3">
						{actions}
					</div>

					<LockNotice>{COMPLETION_STATIC.lockNotice}</LockNotice>
				</OnboardingCard>

				<img
					src={onboardingAssets.illustrations[recipient]}
					alt=""
					aria-hidden="true"
					className="mx-auto hidden lg:block lg:w-[443px]"
				/>
			</motion.main>
		</OnboardingShell>
	);
}
