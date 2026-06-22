import { Ionicons } from "@expo/vector-icons";
import { useThemeColor } from "heroui-native/hooks";
import { Pressable, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { formatDateLong } from "@/lib/journal/formatDate";

type JournalEntryRowProps = {
	title: string;
	dateMs: number;
	mode?: "writing" | "recording";
	onPress?: () => void;
	/** When true, render a selection checkbox instead of the action icon. */
	selectable?: boolean;
	selected?: boolean;
};

function BookOpenTextIcon({
	color,
	size = 24,
}: {
	color: string;
	size?: number;
}) {
	return (
		<Svg width={size} height={size} viewBox="0 0 256 256" fill="none">
			<Path
				fill={color}
				d="M232,48H160a40,40,0,0,0-32,16A40,40,0,0,0,96,48H24a8,8,0,0,0-8,8V200a8,8,0,0,0,8,8H96a24,24,0,0,1,24,24,8,8,0,0,0,16,0,24,24,0,0,1,24-24h72a8,8,0,0,0,8-8V56A8,8,0,0,0,232,48ZM96,192H32V64H96a24,24,0,0,1,24,24V200A39.81,39.81,0,0,0,96,192Zm128,0H160a39.81,39.81,0,0,0-24,8V88a24,24,0,0,1,24-24h64ZM160,88h40a8,8,0,0,1,0,16H160a8,8,0,0,1,0-16Zm48,40a8,8,0,0,1-8,8H160a8,8,0,0,1,0-16h40A8,8,0,0,1,208,128Zm0,32a8,8,0,0,1-8,8H160a8,8,0,0,1,0-16h40A8,8,0,0,1,208,160Z"
			/>
		</Svg>
	);
}

/**
 * Row used inside the journal detail list. White card with the entry title and
 * date on the left, and a teal half-circle on the right with a book (writing)
 * or microphone (recording) icon. In selection mode the half-circle shows a
 * check toggle.
 */
export function JournalEntryRow({
	title,
	dateMs,
	mode = "writing",
	onPress,
	selectable = false,
	selected = false,
}: JournalEntryRowProps) {
	const [accent, accentForeground, foreground, warning] = useThemeColor([
		"accent",
		"accent-foreground",
		"foreground",
		"warning",
	]);

	const rightIcon = selectable
		? selected
			? "checkmark-circle"
			: "ellipse-outline"
		: mode === "recording"
			? "mic"
			: null;

	// Recording entries get the amber tile (matches web); writing entries stay
	// teal. Selection mode keeps the teal accent.
	const recordingTile = !selectable && mode === "recording";
	const tileBg = selectable
		? selected
			? accent
			: `${accent}33`
		: recordingTile
			? warning
			: accent;

	return (
		<Pressable
			onPress={onPress}
			accessibilityRole={selectable ? "checkbox" : "button"}
			accessibilityState={selectable ? { checked: selected } : undefined}
			accessibilityLabel={
				selectable
					? `${selected ? "Selected" : "Not selected"} entry ${title}`
					: `Open entry ${title}`
			}
			className="relative overflow-hidden rounded-2xl bg-background pl-4 active:scale-[0.98] active:opacity-90"
			style={{
				shadowColor: foreground,
				shadowOpacity: 0.06,
				shadowRadius: 6,
				shadowOffset: { width: 0, height: 1 },
				elevation: 1,
			}}
		>
			<View className="flex-row items-stretch">
				<View className="flex-1 py-4 pr-3">
					<Text
						className="font-semibold text-base text-foreground"
						numberOfLines={1}
					>
						{title}
					</Text>
					<Text className="mt-0.5 text-muted-foreground text-sm">
						{formatDateLong(dateMs)}
					</Text>
				</View>

				<View
					className="w-20 items-center justify-center"
					style={{
						backgroundColor: tileBg,
						borderTopLeftRadius: 999,
						borderBottomLeftRadius: 999,
						borderLeftWidth: selectable && !selected ? 0 : 1,
						borderLeftColor: "#6b6b6b",
					}}
				>
					{rightIcon ? (
						<Ionicons name={rightIcon} size={24} color={accentForeground} />
					) : (
						<BookOpenTextIcon color={accentForeground} size={24} />
					)}
				</View>
			</View>
		</Pressable>
	);
}
