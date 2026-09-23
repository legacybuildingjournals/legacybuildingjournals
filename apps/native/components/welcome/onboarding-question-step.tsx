import { Ionicons } from "@expo/vector-icons";
import type { Question } from "@legacy-building/backend/convex/onboarding/questions";
import { TOTAL_QUESTIONS } from "@legacy-building/backend/convex/onboarding/questions";
import { useThemeColor } from "heroui-native";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { OnboardingOptionRow } from "./onboarding-option-row";

/** Fixed-length and never reordered, so stable ids beat array indices as keys. */
const PROGRESS_SEGMENTS = Array.from(
	{ length: TOTAL_QUESTIONS },
	(_, index) => `segment-${index + 1}`,
);

type OnboardingQuestionStepProps = {
	question: Question;
	/** 1-based position, for "N of 7". */
	index: number;
	selectedOptionId?: string;
	busy: boolean;
	onSelect: (optionId: string) => void;
	onBack?: () => void;
};

export function OnboardingQuestionStep({
	question,
	index,
	selectedOptionId,
	busy,
	onSelect,
	onBack,
}: OnboardingQuestionStepProps) {
	const insets = useSafeAreaInsets();
	const foreground = useThemeColor("foreground");

	return (
		<View
			className="flex-1 bg-onboarding-canvas"
			style={{ paddingTop: insets.top + 8 }}
		>
			<View className="px-6 pb-3">
				<View className="h-9 flex-row items-center justify-between">
					{onBack ? (
						<Pressable
							onPress={onBack}
							disabled={busy}
							accessibilityRole="button"
							accessibilityLabel="Back"
							className="-ml-2 flex-row items-center gap-1 rounded-full px-2 py-1 active:opacity-70 disabled:opacity-40"
						>
							<Ionicons name="chevron-back" size={22} color={foreground} />
							<Text className="text-[17px] text-foreground">Back</Text>
						</Pressable>
					) : (
						<View />
					)}

					<Text className="text-[15px] text-muted-foreground">
						{index} of {TOTAL_QUESTIONS}
					</Text>
				</View>

				<View
					className="mt-3 flex-row gap-1.5"
					accessibilityRole="progressbar"
					accessibilityValue={{ min: 0, max: TOTAL_QUESTIONS, now: index }}
				>
					{PROGRESS_SEGMENTS.map((segment, position) => (
						<View
							key={segment}
							className={`h-1.5 flex-1 rounded-full ${
								position < index ? "bg-primary" : "bg-border"
							}`}
						/>
					))}
				</View>
			</View>

			<ScrollView
				contentContainerClassName="grow px-6 pb-6 gap-3"
				showsVerticalScrollIndicator={false}
			>
				{question.eyebrow ? (
					<Text className="text-[12px] text-muted-foreground tracking-[1.5px]">
						{question.eyebrow}
					</Text>
				) : null}

				<Text className="font-bold text-[28px] text-foreground leading-[34px]">
					{question.prompt}
				</Text>

				{question.helper ? (
					<Text className="text-[15px] text-muted-foreground leading-[21px]">
						{question.helper}
					</Text>
				) : null}

				<View className="mt-2 gap-2.5">
					{question.options.map((option) => (
						<OnboardingOptionRow
							key={option.id}
							option={option}
							selected={selectedOptionId === option.id}
							disabled={busy}
							onPress={() => onSelect(option.id)}
						/>
					))}
				</View>

				{question.footer ? (
					<View className="mt-4 rounded-2xl bg-primary/10 p-4">
						<Text className="text-center text-[15px] text-primary leading-[21px]">
							{question.footer}
						</Text>
					</View>
				) : null}

				<View style={{ height: insets.bottom }} />
			</ScrollView>
		</View>
	);
}
