import { onboardingAssets } from "@legacy-building/assets";
import { WEB_INTRO_COPY } from "@legacy-building/backend/convex/onboarding/copy";
import { cn } from "@legacy-building/ui/lib/utils";
import { motion } from "motion/react";

import {
	CardHeading,
	CardSubheading,
	LockNotice,
	OnboardingCard,
	PILL_PRIMARY,
} from "./onboarding-card";
import { OnboardingShell, OnboardingTopBar } from "./onboarding-shell";

const BADGE_BG = {
	time: "bg-onb-pill-write",
	personalized: "bg-onb-pill-voice",
	instant: "bg-onb-pill-video",
} as const;

/** The "Let's personalize the Legacy Building" screen shown before Q1. */
export function OnboardingIntro({ onStart }: { onStart: () => void }) {
	return (
		<OnboardingShell>
			<OnboardingTopBar />
			<motion.main
				initial={{ opacity: 0, y: 8 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.22, ease: "easeOut" }}
				className="mx-auto grid min-h-[calc(100svh-72px)] w-full max-w-[1128px] content-center items-center gap-8 px-2.5 py-8 sm:min-h-[calc(100svh-88px)] sm:px-12 lg:grid-cols-[minmax(0,554px)_461px] lg:justify-center lg:gap-x-6 lg:py-[46px]"
			>
				<OnboardingCard>
					<CardHeading>{WEB_INTRO_COPY.heading}</CardHeading>
					<CardSubheading>{WEB_INTRO_COPY.subheading}</CardSubheading>
					<p className="max-w-[448px] pb-5 text-center text-[15px] text-onb-muted-warm leading-[24.38px]">
						{WEB_INTRO_COPY.body}
					</p>

					<ul className="flex w-full max-w-[384px] justify-center gap-4 pb-7">
						{WEB_INTRO_COPY.badges.map((badge) => (
							<li
								key={badge.key}
								className="flex min-w-0 flex-1 basis-0 flex-col items-center gap-2"
							>
								<span
									className={cn(
										"flex size-14 items-center justify-center rounded-full shadow-[0_1px_1px_rgba(0,0,0,0.05)]",
										BADGE_BG[badge.key],
									)}
								>
									<img
										src={onboardingAssets.badges[badge.key]}
										alt=""
										aria-hidden="true"
										className="size-[34px] object-contain"
									/>
								</span>
								<span className="text-center font-bold font-onb-cta text-[12px] text-onb-pill-label leading-4">
									{badge.label}
								</span>
							</li>
						))}
					</ul>

					<p className="max-w-[384px] pb-6 text-center text-[13.5px] text-onb-muted-warm leading-[21.94px]">
						{WEB_INTRO_COPY.paragraph}
					</p>

					<button type="button" onClick={onStart} className={PILL_PRIMARY}>
						{WEB_INTRO_COPY.cta}
					</button>

					<LockNotice>{WEB_INTRO_COPY.lockNotice}</LockNotice>
				</OnboardingCard>

				<img
					src={onboardingAssets.introIllustration}
					alt=""
					aria-hidden="true"
					className="mx-auto hidden lg:block lg:w-[461px]"
				/>
			</motion.main>
		</OnboardingShell>
	);
}
