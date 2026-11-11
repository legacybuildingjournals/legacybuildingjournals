import { Ionicons } from "@expo/vector-icons";
import { useThemeColor } from "heroui-native";
import { Image, Pressable, Text, View } from "react-native";

import { formatDate } from "@/lib/journal/formatDate";

type JournalListItemProps = {
	title: string;
	dateMs: number;
	coverImageUrl?: string | null;
	onPress?: () => void;
	onAddEntry?: () => void;
	/** Figma: green "Shared Journal" pill on the cover. */
	isShared?: boolean;
};

/**
 * Library row.
 * - When the journal has a cover image: full-width card with the image on top
 *   and a teal title/date footer with an add-entry button.
 * - When it doesn't: a compact teal row with title, date, and add-entry button.
 */
export function JournalListItem({
	title,
	dateMs,
	coverImageUrl,
	onPress,
	onAddEntry,
	isShared = false,
}: JournalListItemProps) {
	const primary = useThemeColor("accent");
	const hasImage = Boolean(coverImageUrl);

	return (
		<Pressable
			onPress={onPress}
			accessibilityRole="button"
			accessibilityLabel={`Open journal ${title}`}
			className="overflow-hidden rounded-2xl bg-primary active:opacity-95"
		>
			{isShared ? (
				<View className="absolute top-3 right-3 z-10 rounded-full bg-green-50 px-2.5 py-0.5">
					<Text className="font-medium text-green-800 text-xs">
						Shared Journal
					</Text>
				</View>
			) : null}
			{hasImage ? (
				<View className="border border-[#d4d4d4] bg-[#e8e8e8] p-3">
					<View className="overflow-hidden rounded-xl bg-[#e8e8e8]">
						<Image
							source={{ uri: coverImageUrl ?? undefined }}
							className="h-56 w-full"
							resizeMode="cover"
							accessibilityLabel=""
						/>
					</View>
				</View>
			) : null}

			<View className="flex-row items-center gap-3 px-5 py-4">
				<View className="min-w-0 flex-1">
					<Text
						className="font-semibold text-lg text-primary-foreground"
						numberOfLines={1}
					>
						{title}
					</Text>
					<Text className="mt-0.5 text-primary-foreground/85 text-sm">
						{formatDate(dateMs)}
					</Text>
				</View>

				<Pressable
					onPress={(e) => {
						e.stopPropagation();
						onAddEntry?.();
					}}
					accessibilityRole="button"
					accessibilityLabel={`Add entry to ${title}`}
					className="size-11 shrink-0 items-center justify-center rounded-full bg-background active:opacity-85"
				>
					<Ionicons name="add" size={26} color={primary} />
				</Pressable>
			</View>
		</Pressable>
	);
}
