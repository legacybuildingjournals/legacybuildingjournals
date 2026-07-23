import { Ionicons } from "@expo/vector-icons";
import { useThemeColor } from "heroui-native/hooks";
import { Pressable, Text, View } from "react-native";

export type EntryMode = "writing" | "recording" | "video";

type EntryModeTabsProps = {
	value: EntryMode;
	onChange: (next: EntryMode) => void;
};

const TABS: Array<{
	id: EntryMode;
	label: string;
	icon: keyof typeof Ionicons.glyphMap;
	accessibilityLabel: string;
}> = [
	{
		id: "writing",
		label: "Writing",
		icon: "create-outline",
		accessibilityLabel: "Writing journal",
	},
	{
		id: "recording",
		label: "Recording",
		icon: "mic-outline",
		accessibilityLabel: "Recording journal",
	},
	{
		id: "video",
		label: "Video",
		icon: "videocam-outline",
		accessibilityLabel: "Video journal",
	},
];

/**
 * Writing | Recording | Video selector. The active tab fills with the accent
 * for its medium — teal for writing, amber for the two recorded kinds, which
 * matches how those entries are coloured everywhere else.
 */
export function EntryModeTabs({ value, onChange }: EntryModeTabsProps) {
	const [accent, accentForeground, warning, warningForeground, foreground] =
		useThemeColor([
			"accent",
			"accent-foreground",
			"warning",
			"warning-foreground",
			"foreground",
		]);

	return (
		<View className="flex-row gap-1 rounded-2xl bg-background p-1">
			{TABS.map((tab) => {
				const active = tab.id === value;
				const activeBg = tab.id === "writing" ? accent : warning;
				const activeFg =
					tab.id === "writing" ? accentForeground : warningForeground;

				return (
					<Pressable
						key={tab.id}
						onPress={() => onChange(tab.id)}
						accessibilityRole="button"
						accessibilityState={{ selected: active }}
						accessibilityLabel={tab.accessibilityLabel}
						className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl px-2 py-3 active:opacity-85"
						// The active pill colour depends on the medium, so it can't be a
						// static class.
						style={active ? { backgroundColor: activeBg } : undefined}
					>
						<Ionicons
							name={tab.icon}
							size={17}
							color={active ? activeFg : foreground}
						/>
						<Text
							className="font-semibold text-sm"
							style={{ color: active ? activeFg : foreground }}
						>
							{tab.label}
						</Text>
					</Pressable>
				);
			})}
		</View>
	);
}
