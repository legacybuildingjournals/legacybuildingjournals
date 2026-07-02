import { ActivityIndicator, Image, View } from "react-native";

import { nativeImages } from "@/lib/assets";

/**
 * Full-screen branded loader shown while auth / first data load resolves.
 *
 * Routes must render this (not `null`) while waiting, otherwise a slow or
 * stalled auth/query leaves the RN root painted its default white — a silent
 * "white screen of death" on first launch. A branded teal screen is both better
 * UX and makes a genuine stall visibly diagnosable instead of looking broken.
 */
export function LoadingScreen() {
	return (
		<View className="flex-1 items-center justify-center gap-8 bg-primary">
			<Image
				source={nativeImages.verticalLogo}
				className="h-[124px] w-[180px]"
				resizeMode="contain"
				accessibilityLabel="Legacy Building"
			/>
			<ActivityIndicator color="#ffffff" />
		</View>
	);
}
