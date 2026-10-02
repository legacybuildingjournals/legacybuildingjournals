import type { Question } from "@legacy-building/backend/convex/onboarding/questions";
import { TOTAL_QUESTIONS } from "@legacy-building/backend/convex/onboarding/questions";
import { ChevronLeft } from "lucide-react-native";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCSSVariable } from "uniwind";

import { OnboardingHeader } from "./onboarding-header";
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
	const back = useCSSVariable("--color-onb-back");

	return (
		<View className="flex-1 bg-onb-canvas">
			<OnboardingHeader />

			<ScrollView
				contentContainerClassName="px-5 pt-4 gap-3"
				contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
				showsVerticalScrollIndicator={false}
			>
				<View className="gap-3">
					<View className="h-6 flex-row items-center justify-between">
						{onBack ? (
							<Pressable
								onPress={onBack}
								disabled={busy}
								accessibilityRole="button"
								accessibilityLabel="Back"
								hitSlop={12}
								className="-ml-1 flex-row items-center active:opacity-60 disabled:opacity-40"
							>
								<ChevronLeft size={18} color={String(back)} strokeWidth={2.5} />
								<Text className="ml-1 font-onb-medium text-[15px] text-onb-back leading-5">
									Back
								</Text>
							</Pressable>
						) : (
							<View />
						)}
						<Text className="font-onb-medium text-[14px] text-onb-muted leading-5">
							{index} of {TOTAL_QUESTIONS}
						</Text>
					</View>

					<View
						className="h-1 flex-row gap-1.5"
						accessibilityRole="progressbar"
						accessibilityValue={{ min: 0, max: TOTAL_QUESTIONS, now: index }}
					>
						{PROGRESS_SEGMENTS.map((segment, position) => (
							<View
								key={segment}
								className={`h-1 flex-1 rounded-full ${
									position < index
										? "bg-onb-progress"
										: "bg-onb-progress-pending"
								}`}
							/>
						))}
					</View>
				</View>

				<View className="gap-2 pt-2">
					{question.eyebrow ? (
						<Text className="font-onb-bold text-[11px] text-onb-eyebrow uppercase leading-4 tracking-[0.55px]">
							{question.eyebrow}
						</Text>
					) : null}

					<Text className="font-onb-extrabold text-[22px] text-onb-ink leading-[30px] tracking-[-0.45px]">
						{question.prompt}
					</Text>

					{question.helper ? (
						<Text className="font-onb-medium text-[14.5px] text-onb-muted leading-5">
							{question.helper}
						</Text>
					) : null}
				</View>

				<View className="gap-3.5 pt-2">
					{question.options.map((option, position) => (
						<OnboardingOptionRow
							key={option.id}
							option={option}
							index={position}
							selected={selectedOptionId === option.id}
							disabled={busy}
							onPress={() => onSelect(option.id)}
						/>
					))}
				</View>

				{question.footer ? (
					<View className="mt-2 rounded-2xl bg-onb-footer-bg px-4 py-4">
						<Text className="text-center font-onb-medium text-[13px] text-onb-footer-text leading-5">
							{question.footer}
						</Text>
					</View>
				) : null}
			</ScrollView>
		</View>
	);
}
