import { api } from "@legacy-building/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { type Href, useRouter } from "expo-router";
import { useCallback, useEffect, useRef } from "react";
import { AppState, type AppStateStatus, Platform } from "react-native";

import { useNativeCurrentUser } from "@/hooks/use-native-current-user";
import {
	configureNotificationHandler,
	getExpoPushToken,
	rescheduleDailyPrompts,
} from "@/lib/notifications/scheduler";

// Set the foreground presentation behavior once, before any notification lands.
configureNotificationHandler();

function projectIdFromConfig(): string | undefined {
	const easProjectId = Constants.expoConfig?.extra?.eas?.projectId;
	return typeof easProjectId === "string" ? easProjectId : undefined;
}

function tokenPlatform(): "ios" | "android" | "web" {
	if (Platform.OS === "ios") return "ios";
	if (Platform.OS === "android") return "android";
	return "web";
}

/**
 * Wires up push notifications for the signed-in user:
 * - registers this device's Expo push token with Convex (for remote reminders),
 * - keeps the rotating daily journaling prompts scheduled locally,
 * - routes notification taps to the right screen.
 *
 * Safe to mount once near the app root. All work is gated on being signed in
 * with a Convex user row, and token registration runs at most once per token.
 */
export function usePushNotifications(): void {
	const router = useRouter();
	const { isSignedIn, convexUser } = useNativeCurrentUser();

	const isWeb = Platform.OS === "web";

	const preferences = useQuery(
		api.notifications.queries.getMyPreferences,
		!isWeb && isSignedIn && convexUser ? {} : "skip",
	);
	const registerPushToken = useMutation(
		api.notifications.mutations.registerPushToken,
	);

	const registeredTokenRef = useRef<string | null>(null);

	// Register (or refresh) the Expo push token once we have a Convex user.
	useEffect(() => {
		if (isWeb || !isSignedIn || !convexUser) return;
		let cancelled = false;

		void (async () => {
			const token = await getExpoPushToken(projectIdFromConfig());
			if (cancelled || !token) return;
			if (registeredTokenRef.current === token) return;
			registeredTokenRef.current = token;
			try {
				await registerPushToken({
					token,
					platform: tokenPlatform(),
					deviceName: Device.deviceName ?? undefined,
				});
			} catch (err) {
				registeredTokenRef.current = null;
				console.warn("[notifications] registerPushToken failed:", err);
			}
		})();

		return () => {
			cancelled = true;
		};
	}, [isSignedIn, convexUser, registerPushToken]);

	// Keep the local daily-prompt queue in sync with the user's preferences.
	const syncDailyPrompts = useCallback(() => {
		if (isWeb || !preferences) return;
		void rescheduleDailyPrompts({
			dailyPrompts: preferences.dailyPrompts,
			dailyPromptHour: preferences.dailyPromptHour,
			dailyPromptMinute: preferences.dailyPromptMinute,
		});
	}, [preferences]);

	useEffect(() => {
		syncDailyPrompts();
	}, [syncDailyPrompts]);

	// Refill the 14-day window whenever the app returns to the foreground.
	useEffect(() => {
		const sub = AppState.addEventListener("change", (state: AppStateStatus) => {
			if (state === "active") syncDailyPrompts();
		});
		return () => sub.remove();
	}, [syncDailyPrompts]);

	// Route notification taps to the screen named in the payload's `url`.
	const handleResponse = useCallback(
		(response: Notifications.NotificationResponse | null) => {
			const url = response?.notification.request.content.data?.url;
			if (typeof url === "string" && url.length > 0) {
				router.push(url as Href);
			}
		},
		[router],
	);

	useEffect(() => {
		// expo-notifications doesn't implement the response APIs on web.
		if (isWeb) return;
		// Cold start: the app was opened by tapping a notification.
		void Notifications.getLastNotificationResponseAsync().then(handleResponse);
		// Warm taps while the app is running.
		const sub =
			Notifications.addNotificationResponseReceivedListener(handleResponse);
		return () => sub.remove();
	}, [handleResponse, isWeb]);
}
