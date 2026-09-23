import { Ionicons } from "@expo/vector-icons";
import type { QuestionOption } from "@legacy-building/backend/convex/onboarding/questions";
import { useThemeColor } from "heroui-native";
import { Pressable, Text, View } from "react-native";

import { ONBOARDING_ICONS } from "@/lib/onboarding/icons";

/**
 * Tint id -> chip background class. Written out rather than interpolated
 * because Uniwind extracts class names statically, so a template string would
 * produce no style.
 */
const CHIP_CLASS: Record<string, string> = {
	"chip-1": "bg-chip-1",
	"chip-2": "bg-chip-2",
	"chip-3": "bg-chip-3",
	"chip-4": "bg-chip-4",
	"chip-5": "bg-chip-5",
};

type OnboardingOptionRowProps = {
	option: QuestionOption;
	selected: boolean;
	disabled: boolean;
	onPress: () => void;
};

export function OnboardingOptionRow({
	option,
	selected,
	disabled,
	onPress,
}: OnboardingOptionRowProps) {
	// Ionicons takes `color`, not `className` — the documented exception in the
	// native styling rule. One semantic colour reads correctly on all five chip
	// tints in both themes, so the glyph doesn't need a per-tint colour.
	const [foreground, accentForeground, muted] = useThemeColor([
		"foreground",
		"accent-foreground",
		"muted",
	]);

	return (
		<Pressable
			onPress={onPress}
			disabled={disabled}
			accessibilityRole="button"
			accessibilityState={{ selected, disabled }}
			className={`flex-row items-center gap-3 rounded-2xl border p-3 active:opacity-80 disabled:opacity-60 ${
				selected
					? "border-primary bg-primary"
					: "border-border bg-card active:bg-muted"
			}`}
		>
			<View
				className={`h-11 w-11 items-center justify-center rounded-full ${
					selected
						? "bg-primary-foreground/20"
						: (CHIP_CLASS[option.tint] ?? "bg-muted")
				}`}
			>
				<Ionicons
					name={ONBOARDING_ICONS[option.icon]}
					size={20}
					color={selected ? accentForeground : foreground}
				/>
			</View>

			<Text
				className={`flex-1 text-[16px] leading-[22px] ${
					selected ? "font-semibold text-primary-foreground" : "text-foreground"
				}`}
			>
				{option.label}
			</Text>

			<Ionicons
				name="chevron-forward"
				size={18}
				color={selected ? accentForeground : muted}
			/>
		</Pressable>
	);
}
