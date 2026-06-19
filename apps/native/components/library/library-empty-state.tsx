import libraryEmptyImage from "@legacy-building/assets/images/library-empty.png";
import { useThemeColor } from "heroui-native/hooks";
import { Image, Pressable, Text, View } from "react-native";

type LibraryEmptyStateProps = {
	ctaLabel?: string;
	onPressCta?: () => void;
};

export function LibraryEmptyState({
	ctaLabel = "Create Journal",
	onPressCta,
}: LibraryEmptyStateProps) {
	const foreground = useThemeColor("foreground");

	return (
		<View className="flex-1 items-center justify-center px-4 pb-16">
			<Image
				source={libraryEmptyImage}
				className="size-[300px] opacity-20"
				resizeMode="contain"
				accessibilityLabel=""
			/>
			<Text
				className="mt-5 text-center text-base leading-[22px]"
				style={{ color: foreground }}
			>
				You haven&apos;t created any Journals yet
			</Text>
			{onPressCta ? (
				<Pressable
					onPress={onPressCta}
					accessibilityRole="button"
					accessibilityLabel={ctaLabel}
					className="mt-5 h-12 w-full max-w-[360px] items-center justify-center rounded-full bg-primary px-6 active:opacity-90"
				>
					<Text className="font-semibold text-base text-primary-foreground">
						{ctaLabel}
					</Text>
				</Pressable>
			) : null}
		</View>
	);
}
