import { NATIVE_INTRO_COPY } from "@legacy-building/backend/convex/onboarding/copy";
import { ChevronRight } from "lucide-react-native";
import {
	Image,
	Pressable,
	ScrollView,
	Text,
	useWindowDimensions,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useCSSVariable } from "uniwind";

import { OnboardingHeader } from "./onboarding-header";
import { OnboardingPills } from "./onboarding-pills";

const HERO = require("../../assets/images/onboarding/hero.jpg");

/** The client's mother-and-child sunset photo is 1248x546 and spans the full width. */
const HERO_PHOTO_RATIO = 1248 / 546;
/** How far the header wave overlaps the photo; the crop starts just below the wave. */
const HERO_WAVE_OVERLAP = 14;

type OnboardingIntroStepProps = {
	onStart: () => void;
};

/** "Your Legacy Build Quiz" — the native welcome card shown before Q1. */
export function OnboardingIntroStep({ onStart }: OnboardingIntroStepProps) {
	const insets = useSafeAreaInsets();
	const { width } = useWindowDimensions();
	// Extra height lets the wavy header edge overlap the top of the photo.
	const heroHeight = width / HERO_PHOTO_RATIO + HERO_WAVE_OVERLAP;
	const white = useCSSVariable("--color-onb-white");

	return (
		<View className="flex-1 bg-onb-canvas">
			<ScrollView
				bounces={false}
				showsVerticalScrollIndicator={false}
				contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
			>
				<OnboardingHeader />

				<View
					className="overflow-hidden"
					style={{ height: heroHeight, marginTop: -HERO_WAVE_OVERLAP }}
				>
					<Image
						source={HERO}
						resizeMode="cover"
						style={{ width, height: heroHeight }}
					/>
				</View>

				<View className="mx-[10px] -mt-6 items-center rounded-[32px] border border-onb-card-border bg-onb-white px-5 pt-9 pb-6 shadow-lg">
					<Text className="text-center font-onb-extrabold text-[37px] text-onb-ink-native leading-[47px] tracking-[-0.9px]">
						{NATIVE_INTRO_COPY.titleLead}
					</Text>
					<Text className="text-center font-onb-extrabold text-[37px] text-onb-header leading-[47px] tracking-[-0.9px]">
						{NATIVE_INTRO_COPY.titleAccent}
					</Text>

					<View className="my-4 h-[2px] w-10 rounded-full bg-onb-rule" />

					<Text className="text-center font-onb-bold text-[21px] text-onb-teal-deep leading-8 tracking-[-0.6px]">
						{NATIVE_INTRO_COPY.subheading}
					</Text>
					<Text className="mt-1 text-center font-onb-regular text-[16px] text-onb-muted-warm leading-6">
						{NATIVE_INTRO_COPY.body}
					</Text>

					<View className="mt-6 mb-7 w-full">
						<OnboardingPills labels={NATIVE_INTRO_COPY.pills} />
					</View>

					<Pressable
						onPress={onStart}
						accessibilityRole="button"
						className="w-full flex-row items-center justify-center gap-2 rounded-full bg-onb-teal px-6 py-3.5 shadow-md active:opacity-80"
					>
						<Text className="font-onb-bold text-[15px] text-onb-white leading-6">
							{NATIVE_INTRO_COPY.cta}
						</Text>
						<ChevronRight size={18} color={String(white)} strokeWidth={2.5} />
					</Pressable>
				</View>
			</ScrollView>
		</View>
	);
}
