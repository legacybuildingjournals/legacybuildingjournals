import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import {
	DAILY_PROMPT_MESSAGES,
	FIRST_ENTRY_MESSAGES,
	randomMessage,
	shuffled,
} from "./messages";

/** Shape mirrored from `api.notifications.queries.getMyPreferences`. */
export type NotificationPreferences = {
	dailyPrompts: boolean;
	inactivity: boolean;
	exportReminders: boolean;
	dailyPromptHour: number;
	dailyPromptMinute: number;
	updatedAt: number;
};

/** Category tags stored on each notification so we can selectively cancel them. */
const CATEGORY = {
	dailyPrompt: "daily-prompt",
	firstEntry: "first-entry",
} as const;

const ANDROID_CHANNEL_ID = "default";
/** How many upcoming daily prompts to keep queued (each with rotating copy). */
const DAILY_SCHEDULE_DAYS = 14;

/**
 * Show notifications while the app is foregrounded too — a gentle banner is
 * fine for reflection nudges. Call once at app start.
 */
export function configureNotificationHandler(): void {
	Notifications.setNotificationHandler({
		handleNotification: async () => ({
			shouldShowBanner: true,
			shouldShowList: true,
			shouldPlaySound: true,
			shouldSetBadge: false,
		}),
	});
}

/** Android requires an explicit channel for heads-up notifications. */
async function ensureAndroidChannel(): Promise<void> {
	if (Platform.OS !== "android") return;
	await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
		name: "Reminders",
		importance: Notifications.AndroidImportance.DEFAULT,
		lightColor: "#008080",
	});
}

/**
 * Ask for permission (if not already decided) and return whether we're allowed
 * to post notifications. Does not prompt again once the user has answered.
 */
export async function ensureNotificationPermission(): Promise<boolean> {
	await ensureAndroidChannel();
	const current = await Notifications.getPermissionsAsync();
	if (current.granted) return true;
	if (!current.canAskAgain) return false;
	const requested = await Notifications.requestPermissionsAsync();
	return requested.granted;
}

/**
 * Register this device for remote (Expo) push and return the token, or null if
 * unavailable (simulator, denied permission, missing EAS projectId).
 */
export async function getExpoPushToken(
	projectId: string | undefined,
): Promise<string | null> {
	if (!Device.isDevice) return null;
	if (!projectId) {
		console.warn("[notifications] No EAS projectId — cannot get a push token.");
		return null;
	}
	const granted = await ensureNotificationPermission();
	if (!granted) return null;
	try {
		const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
		return data;
	} catch (err) {
		console.warn("[notifications] getExpoPushTokenAsync failed:", err);
		return null;
	}
}

/** Cancel every scheduled notification tagged with the given category. */
async function cancelByCategory(category: string): Promise<void> {
	const scheduled = await Notifications.getAllScheduledNotificationsAsync();
	await Promise.all(
		scheduled
			.filter((n) => n.content.data?.category === category)
			.map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
	);
}

/**
 * Rebuild the queue of daily journaling prompts. Cancels any previously
 * scheduled prompts, then (if enabled) schedules the next `DAILY_SCHEDULE_DAYS`
 * occurrences at the user's chosen local time, each with rotating copy.
 * Idempotent — safe to call on every launch and whenever preferences change.
 */
export async function rescheduleDailyPrompts(
	prefs: Pick<
		NotificationPreferences,
		"dailyPrompts" | "dailyPromptHour" | "dailyPromptMinute"
	>,
): Promise<void> {
	await cancelByCategory(CATEGORY.dailyPrompt);
	if (!prefs.dailyPrompts) return;

	const pool = shuffled(DAILY_PROMPT_MESSAGES);
	const now = Date.now();

	for (let i = 0; i < DAILY_SCHEDULE_DAYS; i++) {
		const fireDate = new Date();
		fireDate.setDate(fireDate.getDate() + i);
		fireDate.setHours(prefs.dailyPromptHour, prefs.dailyPromptMinute, 0, 0);
		// Skip today if the chosen time has already passed.
		if (fireDate.getTime() <= now) continue;

		const message = pool[i % pool.length];
		if (!message) continue;
		await Notifications.scheduleNotificationAsync({
			content: {
				title: message.title,
				body: message.body,
				sound: "default",
				data: { category: CATEGORY.dailyPrompt, url: "/(tabs)" },
			},
			trigger: {
				type: Notifications.SchedulableTriggerInputTypes.DATE,
				date: fireDate,
			},
		});
	}
}

/**
 * Fire a one-off celebration a few seconds after the user's first entry, so it
 * lands just after the "Entry saved" toast.
 */
export async function scheduleFirstEntryCelebration(): Promise<void> {
	const message = randomMessage(FIRST_ENTRY_MESSAGES);
	await Notifications.scheduleNotificationAsync({
		content: {
			title: message.title,
			body: message.body,
			sound: "default",
			data: { category: CATEGORY.firstEntry, url: "/(tabs)" },
		},
		trigger: {
			type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
			seconds: 4,
			repeats: false,
		},
	});
}

/** Cancel all locally-scheduled notifications (e.g. on sign-out). */
export async function cancelAllLocalNotifications(): Promise<void> {
	await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Fire a sample notification a couple of seconds from now. Used by the "Send a
 * test notification" button so the full local pipeline (permission → schedule →
 * display → tap) can be verified on a simulator. Returns false if permission
 * was denied.
 */
export async function sendTestNotification(): Promise<boolean> {
	const granted = await ensureNotificationPermission();
	if (!granted) return false;
	await Notifications.scheduleNotificationAsync({
		content: {
			title: "Your story matters",
			body: "This is a test reminder — tap to open your journal.",
			sound: "default",
			data: { category: "test", url: "/(tabs)" },
		},
		trigger: {
			type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
			seconds: 2,
			repeats: false,
		},
	});
	return true;
}
