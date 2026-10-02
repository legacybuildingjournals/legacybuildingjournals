import {
	COMPLETION_STATIC,
	type OnboardingResult,
} from "@legacy-building/backend/convex/onboarding/results";
import {
	ActivityIndicator,
	Pressable,
	ScrollView,
	Text,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ConfettiBurst } from "./confetti-burst";
import { OnboardingHeader } from "./onboarding-header";
import { OnboardingLockNotice } from "./onboarding-lock-notice";
import { OnboardingPills } from "./onboarding-pills";

type OnboardingResultStepProps = {
	result: OnboardingResult;
	saving: boolean;
	onContinue: () => void;
};

/** The "You're creating more than a record of…" completion card, with confetti. */
export function OnboardingResultStep({
	result,
	saving,
	onContinue,
}: OnboardingResultStepProps) {
	const insets = useSafeAreaInsets();

	return (
		<View className="flex-1 bg-onb-canvas">
			<OnboardingHeader />

			<ScrollView
				showsVerticalScrollIndicator={false}
				contentContainerClassName="px-[18px] pt-6"
				contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
			>
				<View className="items-center rounded-[32px] border border-onb-card-border bg-onb-white px-5 pt-8 pb-6 shadow-lg">
					<Text className="text-center font-onb-extrabold text-[24px] text-onb-ink-strong leading-[30px] tracking-[-0.6px]">
						{result.heading.replace("\n", " ")}
					</Text>

					<View className="my-4 h-[2px] w-10 rounded-full bg-onb-rule" />

					<Text className="text-center font-onb-bold text-[19px] text-onb-teal-deep leading-7 tracking-[-0.4px]">
						{COMPLETION_STATIC.subheading}
					</Text>
					<Text className="mt-1 mb-5 text-center font-onb-regular text-[14px] text-onb-muted-warm leading-[21px]">
						{result.narrative}
					</Text>

					<OnboardingPills labels={COMPLETION_STATIC.pills} />

					<Text className="mt-6 text-center font-onb-regular text-[13px] text-onb-muted-warm leading-[21px]">
						{COMPLETION_STATIC.paragraph}
					</Text>
					<Text className="mb-6 text-center font-onb-regular text-[13px] text-onb-muted-warm leading-[21px]">
						<Text className="font-onb-bold text-[14px] text-onb-pill-label">
							{COMPLETION_STATIC.emphasis}
						</Text>{" "}
						{COMPLETION_STATIC.emphasisTail}
					</Text>

					<Pressable
						onPress={onContinue}
						disabled={saving}
						accessibilityRole="button"
						className="h-[50px] w-full items-center justify-center rounded-full bg-onb-teal shadow-md active:opacity-80 disabled:opacity-60"
					>
						{saving ? (
							<ActivityIndicator color="white" />
						) : (
							<Text className="font-onb-bold text-[15px] text-onb-white leading-6">
								Create your first journal
							</Text>
						)}
					</Pressable>

					<OnboardingLockNotice />
				</View>
			</ScrollView>

			<ConfettiBurst />
		</View>
	);
}
