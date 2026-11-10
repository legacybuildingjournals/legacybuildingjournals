import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useThemeColor } from "heroui-native/hooks";
import { Pressable } from "react-native";

/** Figma: gift icon in the Desk and Library headers (SST-1). */
export function GiftHeaderButton() {
	const foreground = useThemeColor("accent-foreground");
	return (
		<Pressable
			onPress={() => router.push("/gift")}
			accessibilityRole="button"
			accessibilityLabel="Gift lifetime access"
			hitSlop={8}
			className="size-10 items-center justify-center rounded-full active:scale-95 active:opacity-70"
		>
			<Ionicons name="gift-outline" size={24} color={foreground} />
		</Pressable>
	);
}
