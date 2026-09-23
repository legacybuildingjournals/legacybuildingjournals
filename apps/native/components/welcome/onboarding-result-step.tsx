import type { OnboardingResult } from "@legacy-building/backend/convex/onboarding/results";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AuthPrimaryButton } from "@/components/auth/auth-primary-button";

import { ConfettiBurst } from "./confetti-burst";
import { OnboardingBackground } from "./onboarding-background";

type OnboardingResultStepProps = {
	result: OnboardingResult;
	saving: boolean;
	onContinue: () => void;
};

export function OnboardingResultStep({
	result,
	saving,
	onContinue,
}: OnboardingResultStepProps) {
	const insets = useSafeAreaInsets();

	return (
		<OnboardingBackground>
			<ConfettiBurst />

			<ScrollView
				contentContainerClassName="grow justify-center gap-5"
				showsVerticalScrollIndicator={false}
			>
				<Text className="font-bold text-3xl text-primary-foreground leading-tight">
					{result.heading}
				</Text>

				{result.body.map((paragraph) => (
					<Text
						key={paragraph.slice(0, 40)}
						className="text-[16px] text-primary-foreground/90 leading-[24px]"
					>
						{paragraph}
					</Text>
				))}
			</ScrollView>

			<View style={{ paddingBottom: insets.bottom > 0 ? 0 : 8 }}>
				<AuthPrimaryButton
					label="Create your first journal"
					onPress={onContinue}
					loading={saving}
				/>
			</View>
		</OnboardingBackground>
	);
}
