import { Ionicons } from "@expo/vector-icons";
import { useThemeColor } from "heroui-native/hooks";
import { Pressable, Text, View } from "react-native";

/**
 * Figma paywall card "Give the Gift of a Legacy" → Gift Subscription.
 * `onPress` should close the paywall and open `/gift`.
 */
export function GiftLegacyCard({ onPress }: { onPress: () => void }) {
	const accent = useThemeColor("accent");
	const accentForeground = useThemeColor("accent-foreground");
	return (
		<View className="flex-row items-center gap-4 overflow-hidden rounded-2xl bg-background p-4">
			<View className="flex-1 gap-1">
				<Text className="font-semibold text-foreground text-xl leading-tight">
					Give the Gift of a Legacy
				</Text>
				<Text className="text-muted-foreground text-sm">
					Gift someone special to start building their own legacy
				</Text>
				<Pressable
					onPress={onPress}
					accessibilityRole="button"
					accessibilityLabel="Gift Access"
					className="mt-2 h-9 flex-row items-center gap-2 self-start rounded-full bg-primary px-4 active:scale-[0.98] active:opacity-90"
				>
					<Text className="font-semibold text-primary-foreground text-sm">
						Gift Access
					</Text>
					<Ionicons name="arrow-forward" size={16} color={accentForeground} />
				</Pressable>
			</View>
			<View className="size-16 items-center justify-center rounded-2xl bg-accent/10">
				<Ionicons name="gift" size={32} color={accent} />
			</View>
		</View>
	);
}
