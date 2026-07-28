import { Pressable, Text, View } from "react-native";

export type EntryMode = "writing" | "recording";

type EntryModeTabsProps = {
	value: EntryMode;
	onChange: (next: EntryMode) => void;
};

/**
 * Writing | Recording tab toggle.
 * - Writing (teal): solid teal when active, faded teal when inactive.
 * - Recording (amber): solid amber when active, light-amber when inactive.
 */
export function EntryModeTabs({ value, onChange }: EntryModeTabsProps) {
	const writingActive = value === "writing";
	const recordingActive = value === "recording";

	return (
		<View className="flex-row gap-3">
			<Pressable
				onPress={() => onChange("writing")}
				accessibilityRole="button"
				accessibilityState={{ selected: writingActive }}
				accessibilityLabel="Writing journal"
				className={`flex-1 items-center justify-center rounded-2xl px-4 py-3 active:opacity-85 ${
					writingActive ? "bg-primary" : "bg-primary/40"
				}`}
			>
				<Text className="font-semibold text-base text-primary-foreground">
					Writing Journal
				</Text>
			</Pressable>

			<Pressable
				onPress={() => onChange("recording")}
				accessibilityRole="button"
				accessibilityState={{ selected: recordingActive }}
				accessibilityLabel="Recording journal"
				className={`flex-1 items-center justify-center rounded-2xl px-4 py-3 active:opacity-85 ${
					recordingActive ? "bg-warning" : "bg-warning-soft"
				}`}
			>
				<Text
					className={`font-semibold text-base ${
						recordingActive
							? "text-warning-foreground"
							: "text-warning-soft-foreground"
					}`}
				>
					Recording Journal
				</Text>
			</Pressable>
		</View>
	);
}
