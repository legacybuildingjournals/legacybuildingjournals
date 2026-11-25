import * as Device from "expo-device";
import { Platform } from "react-native";

import { Notifications } from "./expo-notifications";
import {
	DAILY_PROMPT_MESSAGES,
	FIRST_ENTRY_MESSAGES,
	type LocalMessage,
	randomMessage,
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
/** Journaling prompts per calendar week (Monday to Sunday), on random days. */
const PROMPTS_PER_WEEK = 2;
/** How many weeks ahead to keep prompts queued (the queue is rebuilt on every launch). */
const SCHEDULE_WEEKS = 4;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Small seeded PRNG (mulberry32), so a week's random picks are repeatable. */
function seededRandom(seed: number): () => number {
	let state = seed >>> 0;
	return () => {
		state = (state + 0x6d2b79f5) >>> 0;
		let t = state;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/** Local midnight of the Monday that starts the week containing `date`. */
function startOfWeek(date: Date): Date {
	const monday = new Date(date);
	monday.setHours(0, 0, 0, 0);
	monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
	return monday;
}

/**
 * The random days (0 = Monday … 6 = Sunday) and messages for one week. Seeded
 * by the week itself, so rebuilding the queue on every app launch keeps the
 * same picks and never adds a third prompt to a week. The two days are never
 * back to back.
 */
function promptsForWeek(
	monday: Date,
): { dayOffset: number; messageIndex: number }[] {
	const weekNumber = Math.round(
		Date.UTC(monday.getFullYear(), monday.getMonth(), monday.getDate()) /
			(7 * DAY_MS),
	);
	const random = seededRandom(weekNumber);
	const days: number[] = [];
	while (days.length < PROMPTS_PER_WEEK) {
		const day = Math.floor(random() * 7);
		if (days.every((picked) => Math.abs(picked - day) > 1)) days.push(day);
	}
	return days
		.sort((a, b) => a - b)
		.map((dayOffset) => ({
			dayOffset,
			messageIndex: Math.floor(random() * DAILY_PROMPT_MESSAGES.length),
		}));
}

/**
 * Show notifications while the app is foregrounded too — a gentle banner is
 * fine for reflection nudges. Call once at app start.
 */
export function configureNotificationHandler(): void {
	if (!Notifications) return;
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
	if (!Notifications) return;
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
	if (!Notifications) return false;
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
	if (!Notifications) return null;
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
	const notifications = Notifications;
	if (!notifications) return;
	const scheduled = await notifications.getAllScheduledNotificationsAsync();
	await Promise.all(
		scheduled
			.filter((n) => n.content.data?.category === category)
			.map((n) => notifications.cancelScheduledNotificationAsync(n.identifier)),
	);
}

/**
 * Rebuild the queue of journaling prompts: twice a week on random days, at the
 * user's chosen local time, for the next `SCHEDULE_WEEKS` weeks. Cancels any
 * previously scheduled prompts first. Idempotent (each week's picks are
 * seeded), so it's safe to call on every launch and whenever preferences change.
 * The name and the `dailyPrompts*` preference keys are kept from when these
 * were daily, to avoid a backend change.
 */
export async function rescheduleDailyPrompts(
	prefs: Pick<
		NotificationPreferences,
		"dailyPrompts" | "dailyPromptHour" | "dailyPromptMinute"
	>,
): Promise<void> {
	if (!Notifications) return;
	await cancelByCategory(CATEGORY.dailyPrompt);
	if (!prefs.dailyPrompts) return;

	const now = Date.now();
	const thisMonday = startOfWeek(new Date());

	for (let week = 0; week < SCHEDULE_WEEKS; week++) {
		const monday = new Date(thisMonday);
		monday.setDate(monday.getDate() + week * 7);

		for (const { dayOffset, messageIndex } of promptsForWeek(monday)) {
			const fireDate = new Date(monday);
			fireDate.setDate(fireDate.getDate() + dayOffset);
			fireDate.setHours(prefs.dailyPromptHour, prefs.dailyPromptMinute, 0, 0);
			// This week's pick may already be in the past.
			if (fireDate.getTime() <= now) continue;

			const message = DAILY_PROMPT_MESSAGES[messageIndex];
			if (!message) continue;
			await schedulePrompt(message, fireDate);
		}
	}
}

async function schedulePrompt(
	message: LocalMessage,
	fireDate: Date,
): Promise<void> {
	if (!Notifications) return;
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

/**
 * Fire a one-off celebration a few seconds after the user's first entry, so it
 * lands just after the "Entry saved" toast.
 */
export async function scheduleFirstEntryCelebration(): Promise<void> {
	if (!Notifications) return;
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
	if (!Notifications) return;
	await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Fire a sample notification a couple of seconds from now. Used by the "Send a
 * test notification" button so the full local pipeline (permission → schedule →
 * display → tap) can be verified on a simulator. Returns false if permission
 * was denied.
 */
export async function sendTestNotification(): Promise<boolean> {
	if (!Notifications) return false;
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
