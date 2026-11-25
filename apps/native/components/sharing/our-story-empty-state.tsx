import { Ionicons } from "@expo/vector-icons";
import { useThemeColor } from "heroui-native/hooks";
import { Pressable, Text, View } from "react-native";

/** Empty "Our Story" tab: journals only get here by being shared (spec #2). */
export function OurStoryEmptyState({
	onGoToMyStory,
}: {
	onGoToMyStory: () => void;
}) {
	const accent = useThemeColor("accent");
	return (
		<View className="items-center gap-3 rounded-2xl bg-background/90 px-6 py-10">
			<View className="size-12 items-center justify-center rounded-full bg-accent/10">
				<Ionicons name="people-outline" size={24} color={accent} />
			</View>
			<Text className="text-center font-semibold text-foreground text-xl">
				No shared journals yet
			</Text>
			<Text className="text-center text-muted-foreground text-sm leading-5">
				Share one of your journals with a loved one to write it together, or
				accept an invite. Shared journals appear here for both of you.
			</Text>
			<Pressable
				onPress={onGoToMyStory}
				accessibilityRole="button"
				accessibilityLabel="Go to My Story"
				className="mt-2 h-11 items-center justify-center rounded-full bg-primary px-6 active:scale-[0.98] active:opacity-90"
			>
				<Text className="font-semibold text-primary-foreground text-sm">
					Go to My Story
				</Text>
			</Pressable>
		</View>
	);
}
