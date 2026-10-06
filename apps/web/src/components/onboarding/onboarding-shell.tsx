import "@fontsource-variable/nunito";
import "@fontsource/plus-jakarta-sans/600.css";
import "@fontsource/plus-jakarta-sans/700.css";

import { onboardingAssets } from "@legacy-building/assets";
import { cn } from "@legacy-building/ui/lib/utils";
import type { ReactNode } from "react";

/**
 * Page frame for every onboarding surface: the flat mint canvas and the Nunito
 * type from the Figma file. Fonts are imported here so they only load with the
 * onboarding chunk.
 */
export function OnboardingShell({
	children,
	className,
}: {
	children: ReactNode;
	className?: string;
}) {
	return (
		<div
			className={cn(
				// `onboarding-canvas` is a marker, not a style: a rule in index.css
				// matches it to paint the body the same colour, so no seam shows
				// below `min-h-svh` when the mobile browser chrome retracts.
				"onboarding-canvas min-h-svh w-full bg-onb-canvas font-onb text-onb-ink",
				className,
			)}
		>
			{children}
		</div>
	);
}

/** The centred column the question screens sit in: 768px of content, as in the design. */
export function OnboardingColumn({ children }: { children: ReactNode }) {
	return (
		<div className="mx-auto flex w-full max-w-[832px] flex-col px-4 py-6 sm:px-8">
			{children}
		</div>
	);
}

/** Full-width teal bar with the white logo, the header of every onboarding screen. */
export function OnboardingTopBar() {
	return (
		<header className="flex h-[72px] w-full items-center bg-onb-teal px-5 sm:h-[88px] sm:px-[45px]">
			<img
				src={onboardingAssets.logoWhite}
				alt="Legacy Building"
				className="h-[40px] w-auto sm:h-[51px]"
			/>
		</header>
	);
}
