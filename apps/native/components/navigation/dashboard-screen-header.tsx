import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type DashboardScreenHeaderProps = {
	title: string;
	/** Optional action in the right slot (e.g. the gift button on Desk/Library). */
	right?: ReactNode;
};

export function DashboardScreenHeader({
	title,
	right,
}: DashboardScreenHeaderProps) {
	const insets = useSafeAreaInsets();

	return (
		<View
			className="bg-primary px-4 pb-4"
			style={{ paddingTop: insets.top + 12 }}
		>
			<View className="min-h-11 flex-row items-center">
				<View className="size-11" />
				<Text
					className="flex-1 text-center font-semibold text-lg text-primary-foreground"
					numberOfLines={1}
				>
					{title}
				</Text>
				<View className="size-11 items-center justify-center">{right}</View>
			</View>
		</View>
	);
}
