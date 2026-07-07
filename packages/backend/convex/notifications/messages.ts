/**
 * Copy pools for server-driven (Expo Push) reminders. Daily journaling prompts
 * and the first-entry celebration are handled locally on-device (see the native
 * app's `lib/notifications/messages.ts`); the pools here are only the ones the
 * Convex cron sweeps send: inactivity re-engagement and export reminders.
 *
 * Each item is a title + body. Titles are short (shown bold on the lock screen);
 * bodies carry the full sentence.
 */

export type PushMessage = {
	title: string;
	body: string;
};

/** Shown when a user hasn't journaled in a while. */
export const INACTIVITY_MESSAGES: PushMessage[] = [
	{
		title: "Still got a story in you today?",
		body: "Your journal is waiting.",
	},
	{
		title: "Nothing's due",
		body: "But something's always worth saying.",
	},
	{
		title: "It's easier than you think",
		body: "When you open this next, notice how easy it is to just start talking.",
	},
	{
		title: "Today is becoming a memory",
		body: "The longer you wait, the more today becomes a memory you didn't capture. Or… you could capture it now.",
	},
	{
		title: "You already have something to say",
		body: "You already have something to say today. You just haven't said it yet.",
	},
	{
		title: "Your story matters",
		body: "Take a moment to write what today taught you.",
	},
	{
		title: "One reflection at a time",
		body: "Legacy is built one reflection at a time. Ready to capture yours?",
	},
	{
		title: "Legacy isn't loud — it's consistent",
		body: "Add a few lines to your story.",
	},
	{
		title: "What do you want them to know?",
		body: "What do you want them to know that you've never said out loud?",
	},
	{
		title: "A voice they'll need",
		body: "Someday this becomes the voice they didn't know they'd need.",
	},
];

/** Shown to nudge users to back up / export their entries. */
export const EXPORT_MESSAGES: PushMessage[] = [
	{
		title: "Your entries are treasures",
		body: "Export them now to keep them safe.",
	},
	{
		title: "Legacy deserves a backup",
		body: "Save your journal to your device today.",
	},
	{
		title: "Worth preserving",
		body: "Your reflections are worth preserving. Export your latest entries now.",
	},
	{
		title: "Don't let your story stay locked away",
		body: "Export and share when ready.",
	},
	{
		title: "Your legacy is growing",
		body: "Make sure it's saved. Export your journal today.",
	},
];

/** Pick a message from a pool, rotating by index so consecutive sends differ. */
export function pickMessage(pool: PushMessage[], seed: number): PushMessage {
	if (pool.length === 0) {
		return { title: "Legacy Building", body: "Open your journal." };
	}
	const index = Math.abs(Math.floor(seed)) % pool.length;
	return pool[index] as PushMessage;
}
