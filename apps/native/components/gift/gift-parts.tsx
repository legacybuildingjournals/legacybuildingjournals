import { Ionicons } from "@expo/vector-icons";
import { imageAssets } from "@legacy-building/assets";
import { useThemeColor } from "heroui-native/hooks";
import type { ReactNode } from "react";
import {
	ActivityIndicator,
	Image,
	type ImageSourcePropType,
	Pressable,
	Text,
	View,
} from "react-native";

/** Metro resolves the shared images to asset modules (see community.tsx). */
const GIFT_HERO = imageAssets.giftHero as unknown as ImageSourcePropType;

/**
 * Figma hero artwork ("Gift Lifetime Access / Give someone you love a
 * lifetime of stories."). The headline is part of the image.
 */
export function GiftHero() {
	return (
		<View className="overflow-hidden rounded-2xl bg-secondary">
			<Image
				source={GIFT_HERO}
				accessibilityLabel="Gift Lifetime Access. Give someone you love a lifetime of stories."
				resizeMode="cover"
				className="w-full"
				style={{ aspectRatio: 370 / 272 }}
			/>
		</View>
	);
}

export function GiftHowItWorks({ children }: { children: ReactNode }) {
	const accent = useThemeColor("accent");
	return (
		<View className="flex-row items-start gap-3 rounded-2xl bg-accent/10 p-4">
			<View className="size-9 items-center justify-center rounded-full bg-background">
				<Ionicons name="paper-plane-outline" size={16} color={accent} />
			</View>
			<View className="flex-1 gap-0.5">
				<Text className="font-semibold text-foreground text-sm">
					How it works?
				</Text>
				<Text className="text-muted-foreground text-xs leading-5">
					{children}
				</Text>
			</View>
		</View>
	);
}

export function GiftPrimaryButton({
	label,
	onPress,
	loading = false,
	disabled = false,
	icon,
}: {
	label: string;
	onPress: () => void;
	loading?: boolean;
	disabled?: boolean;
	icon?: keyof typeof Ionicons.glyphMap;
}) {
	const foreground = useThemeColor("accent-foreground");
	return (
		<Pressable
			onPress={onPress}
			disabled={disabled || loading}
			accessibilityRole="button"
			accessibilityLabel={label}
			accessibilityState={{ disabled: disabled || loading, busy: loading }}
			className="h-12 flex-row items-center justify-center gap-2 rounded-full bg-primary px-6 active:scale-[0.98] active:opacity-90 disabled:opacity-60"
		>
			{loading ? (
				<ActivityIndicator color={foreground} />
			) : icon ? (
				<Ionicons name={icon} size={18} color={foreground} />
			) : null}
			<Text className="font-semibold text-primary-foreground text-sm">
				{label}
			</Text>
		</Pressable>
	);
}
