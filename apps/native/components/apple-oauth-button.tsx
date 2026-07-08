import { useSignInWithApple } from "@clerk/expo/apple";
import * as AppleAuthentication from "expo-apple-authentication";
import { type Href, useRouter } from "expo-router";
import { useState } from "react";
import { Platform } from "react-native";

// Native "Sign in with Apple" (Face ID / Touch ID sheet) via Clerk's
// useSignInWithApple hook. iOS-only — the native module and Apple's HIG button
// don't exist on Android, where `oauth_google` (browser SSO) is used instead.
//
// Styling exception: AppleAuthenticationButton only accepts a `style` prop (no
// className), and Apple requires its own pixel-perfect button for App Review, so
// we use inline style here rather than Uniwind tokens. `cornerRadius: 24` matches
// the h-12 / rounded-full pill of the Google button.
export function AppleOAuthButton() {
	const { startAppleAuthenticationFlow } = useSignInWithApple();
	const router = useRouter();
	const [pending, setPending] = useState(false);

	if (Platform.OS !== "ios") return null;

	const handlePress = async () => {
		if (pending) return;
		setPending(true);

		try {
			const { createdSessionId, setActive } =
				await startAppleAuthenticationFlow();

			if (createdSessionId && setActive) {
				await setActive({ session: createdSessionId });
				router.replace("/(tabs)" as Href);
			}
		} catch (err: unknown) {
			const error = err as { code?: string };
			// User dismissed the native Apple sheet — not an error worth surfacing.
			if (error?.code === "ERR_REQUEST_CANCELED") return;
			console.error("Apple OAuth error:", err);
		} finally {
			setPending(false);
		}
	};

	return (
		<AppleAuthentication.AppleAuthenticationButton
			buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
			buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
			cornerRadius={24}
			style={{ height: 48, width: "100%" }}
			onPress={() => void handlePress()}
		/>
	);
}
