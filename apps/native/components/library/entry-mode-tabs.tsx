import { Ionicons } from "@expo/vector-icons";
import { useThemeColor } from "heroui-native/hooks";
import { Pressable, Text, View } from "react-native";

export type EntryMode = "writing" | "recording" | "video";

type EntryModeTabsProps = {
	value: EntryMode;
	onChange: (next: EntryMode) => void;
};

type TabDef = {
	id: EntryMode;
	label: string;
	icon: keyof typeof Ionicons.glyphMap;
	color: string;
	foreground: string;
};

/**
 * Writing | Recording | Video switcher — a single pill-shaped tray on the
 * page background; only the active tab gets a filled colour chip (mint,
 * amber, or red), inactive tabs stay flat and read in the writing accent.
 */
export function EntryModeTabs({ value, onChange }: EntryModeTabsProps) {
	const [
		accent,
		accentForeground,
		warning,
		warningForeground,
		danger,
		dangerForeground,
	] = useThemeColor([
		"accent",
		"accent-foreground",
		"warning",
		"warning-foreground",
		"danger",
		"danger-foreground",
	]);

	const tabs: TabDef[] = [
		{
			id: "writing",
			label: "Writing",
			icon: "pencil",
			color: accent,
			foreground: accentForeground,
		},
		{
			id: "recording",
			label: "Recording",
			icon: "mic",
			color: warning,
			foreground: warningForeground,
		},
		{
			id: "video",
			label: "Video",
			icon: "videocam",
			color: danger,
			foreground: dangerForeground,
		},
	];

	return (
		<View className="w-full flex-row items-center gap-1 rounded-2xl bg-background p-1.5 shadow-sm">
			{tabs.map((tab) => {
				const active = value === tab.id;
				return (
					<Pressable
						key={tab.id}
						onPress={() => onChange(tab.id)}
						accessibilityRole="button"
						accessibilityState={{ selected: active }}
						accessibilityLabel={`${tab.label} journal`}
						className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl px-2 py-3 active:opacity-85"
						style={{ backgroundColor: active ? tab.color : "transparent" }}
					>
						<Ionicons
							name={tab.icon}
							size={15}
							color={active ? tab.foreground : accent}
						/>
						<Text
							className="font-bold text-sm"
							numberOfLines={1}
							style={{ color: active ? tab.foreground : accent }}
						>
							{tab.label}
						</Text>
					</Pressable>
				);
			})}
		</View>
	);
}
