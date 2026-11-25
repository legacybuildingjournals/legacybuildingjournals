import Constants, { ExecutionEnvironment } from "expo-constants";
import { Platform } from "react-native";

type NotificationsModule = typeof import("expo-notifications");

/**
 * Expo Go on Android (SDK 53+) no longer ships push support, and loading
 * `expo-notifications` there throws immediately, which breaks every route
 * that imports it. In that one environment we skip the module entirely and
 * the app runs without notifications. Development and store builds are
 * unaffected.
 */
export const notificationsUnavailable =
	Platform.OS === "android" &&
	Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

export const Notifications: NotificationsModule | null =
	notificationsUnavailable
		? null
		: // Lazy require so Expo Go on Android never evaluates the module.
			(require("expo-notifications") as NotificationsModule);
