import type { ReactNode } from "react";
import { ImageBackground, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { nativeAssets } from "@/lib/assets";

/** Shared teal hero backdrop for the post-signup onboarding steps. Mirrors the
 * look of `AuthScreen` so the username + welcome-video flow feels continuous
 * with the sign-up screens. */
export function OnboardingBackground({ children }: { children: ReactNode }) {
	const insets = useSafeAreaInsets();

	return (
		<View className="flex-1 bg-primary">
			<ImageBackground
				source={{ uri: nativeAssets.authPanelBackground }}
				style={StyleSheet.absoluteFill}
				resizeMode="cover"
			>
				<View className="absolute inset-0 bg-primary/70" />
			</ImageBackground>

			<View
				className="flex-1 px-6"
				style={{
					paddingTop: insets.top + 16,
					paddingBottom: insets.bottom + 16,
				}}
			>
				{children}
			</View>
		</View>
	);
}
