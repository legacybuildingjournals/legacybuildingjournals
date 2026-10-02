import type { QuestionOption } from "@legacy-building/backend/convex/onboarding/questions";
import { ChevronRight } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import { useCSSVariable } from "uniwind";

import { ONBOARDING_ICONS } from "@/lib/onboarding/icons";

/**
 * Chip colours follow the row's position, not its meaning — that is how the Figma
 * designs assign them. Spelled out so Uniwind can see every class.
 */
const CHIP_BG = [
	"bg-onb-chip-1",
	"bg-onb-chip-2",
	"bg-onb-chip-3",
	"bg-onb-chip-4",
	"bg-onb-chip-5",
	"bg-onb-chip-6",
] as const;

const CHIP_FG_VARS = [
	"--color-onb-chip-fg-1",
	"--color-onb-chip-fg-2",
	"--color-onb-chip-fg-3",
	"--color-onb-chip-fg-4",
	"--color-onb-chip-fg-5",
	"--color-onb-chip-fg-6",
] as const;

type OnboardingOptionRowProps = {
	option: QuestionOption;
	/** Zero-based position in the list. */
	index: number;
	selected: boolean;
	disabled: boolean;
	onPress: () => void;
};

export function OnboardingOptionRow({
	option,
	index,
	selected,
	disabled,
	onPress,
}: OnboardingOptionRowProps) {
	const Icon = ONBOARDING_ICONS[option.icon];
	const slot = index % CHIP_BG.length;

	// Lucide takes a colour prop rather than className, so resolve the theme
	// token to a value instead of hardcoding one.
	const chipFg = useCSSVariable(CHIP_FG_VARS[slot] ?? CHIP_FG_VARS[0]);
	const white = useCSSVariable("--color-onb-white");
	const chevron = useCSSVariable("--color-onb-chevron");

	return (
		<Pressable
			onPress={onPress}
			disabled={disabled}
			accessibilityRole="button"
			accessibilityState={{ selected, disabled }}
			className={`flex-row items-center justify-between rounded-[14px] px-4 py-[11px] shadow-sm active:opacity-80 ${
				selected ? "bg-onb-selected" : "bg-onb-white"
			} ${disabled ? "opacity-60" : ""}`}
		>
			<View className="min-w-0 flex-1 flex-row items-center gap-3.5">
				<View
					className={`size-11 items-center justify-center rounded-full ${
						selected ? "bg-onb-white/20" : CHIP_BG[slot]
					}`}
				>
					<Icon
						size={20}
						color={String(selected ? white : chipFg)}
						strokeWidth={2}
					/>
				</View>
				<Text
					className={`flex-1 font-onb-regular text-[15px] leading-5 ${
						selected ? "text-onb-white" : "text-onb-text"
					}`}
				>
					{option.label}
				</Text>
			</View>

			<ChevronRight
				size={16}
				color={String(selected ? white : chevron)}
				strokeWidth={2.5}
			/>
		</Pressable>
	);
}
