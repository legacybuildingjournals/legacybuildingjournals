import { useThemeColor } from "heroui-native/hooks";
import { Pressable, Text, View } from "react-native";

export type EntryMode = "writing" | "recording" | "video";

type EntryModeTabsProps = {
	value: EntryMode;
	onChange: (next: EntryMode) => void;
	/**
	 * Fill for the active Recording tab. Voice and video are both "recording"
	 * here — which one is chosen shows in the medium select below, not the tab —
	 * so the tab takes whichever accent the current medium owns.
	 */
	accent: string;
};

/**
 * Writing | Recording switcher.
 *
 * Two tabs rather than three: video is a kind of recording, picked from the
 * medium select once Recording is active.
 */
export function EntryModeTabs({ value, onChange, accent }: EntryModeTabsProps) {
	const [primary, primaryForeground] = useThemeColor([
		"accent",
		"accent-foreground",
	]);
	const isWriting = value === "writing";

	return (
		<View className="w-full flex-row gap-3">
			<Pressable
				onPress={() => onChange("writing")}
				accessibilityRole="button"
				accessibilityState={{ selected: isWriting }}
				accessibilityLabel="Writing journal"
				className="flex-1 items-center justify-center rounded-2xl px-4 py-3.5 active:opacity-85"
				// The inactive tab keeps a muted fill rather than going transparent,
				// so the pair still reads as one control.
				style={{ backgroundColor: isWriting ? primary : `${primary}66` }}
			>
				<Text
					className="font-bold text-base"
					style={{ color: primaryForeground }}
				>
					Writing Journal
				</Text>
			</Pressable>

			<Pressable
				// Coming from Writing there is no medium yet, so default to voice.
				onPress={() => onChange(value === "video" ? "video" : "recording")}
				accessibilityRole="button"
				accessibilityState={{ selected: !isWriting }}
				accessibilityLabel="Recording journal"
				className="flex-1 items-center justify-center rounded-2xl px-4 py-3.5 active:opacity-85"
				style={{ backgroundColor: isWriting ? `${accent}66` : accent }}
			>
				<Text
					className="font-bold text-base"
					style={{ color: primaryForeground }}
				>
					Recording Journal
				</Text>
			</Pressable>
		</View>
	);
}
