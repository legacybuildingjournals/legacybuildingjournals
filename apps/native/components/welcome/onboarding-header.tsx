import { NATIVE_INTRO_COPY } from "@legacy-building/backend/convex/onboarding/copy";
import { Image, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { useCSSVariable } from "uniwind";

const LOGO = require("../../assets/images/onboarding/logo-white.png");

/** Height of the wavy lower edge; the intro hero tucks up under it by this much. */
export const ONBOARDING_WAVE_HEIGHT = 22;

/**
 * Teal brand header with the logo, a short tagline and a wavy lower edge. It
 * sits above every native onboarding screen, the intro included.
 */
export function OnboardingHeader() {
	const insets = useSafeAreaInsets();
	const fill = useCSSVariable("--color-onb-header");

	return (
		<View className="z-10">
			<View
				className="flex-row items-center justify-between bg-onb-header px-5 pb-2"
				style={{ paddingTop: insets.top + 12 }}
			>
				<Image
					source={LOGO}
					resizeMode="contain"
					accessibilityLabel="Legacy Building"
					className="h-10 w-30"
				/>
				<Text className="text-right font-onb-medium text-[12px] text-onb-white leading-[17px]">
					{NATIVE_INTRO_COPY.headerTagline}
				</Text>
			</View>
			<Svg
				width="100%"
				height={ONBOARDING_WAVE_HEIGHT}
				viewBox="0 0 390 22"
				preserveAspectRatio="none"
			>
				<Path
					d="M0 0H390V6C340 22 290 2 200 8C130 12 70 22 0 10Z"
					fill={String(fill)}
				/>
			</Svg>
		</View>
	);
}
