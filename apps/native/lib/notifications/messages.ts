/**
 * Copy for the on-device (local) notifications: the rotating daily journaling
 * prompt and the one-off first-entry celebration. Inactivity and export
 * reminders are sent server-side (see the backend's `notifications/messages.ts`).
 */

export type LocalMessage = {
	title: string;
	body: string;
};

/**
 * Rotating pool for the daily journaling prompt. Combines the generic
 * "journaling prompt" copy with the deeper reflective prompts so a user gets
 * variety across days.
 */
export const DAILY_PROMPT_MESSAGES: LocalMessage[] = [
	{
		title: "Your story matters",
		body: "Take a moment to write what today taught you.",
	},
	{
		title: "One reflection at a time",
		body: "Legacy is built one reflection at a time. Ready to capture yours?",
	},
	{
		title: "Consistent, not loud",
		body: "Legacy isn't loud — it's consistent. Add a few lines to your story.",
	},
	{
		title: "The story of your journey",
		body: "Everyone has a story. When the present catches up to the future you, imagine having the story of your journey there.",
	},
	{
		title: "Say the unsaid",
		body: "What do you want them to know that you've never said out loud?",
	},
	{
		title: "A voice they'll need",
		body: "Someday this becomes the voice they didn't know they'd need.",
	},
	{
		title: "A note to 2050",
		body: "What would today's entry mean to someone reading it in 2050?",
	},
	{
		title: "Exactly what they needed",
		body: "Imagine them, years from now, hearing your voice say exactly what they needed.",
	},
	{
		title: "More than a memory",
		body: "You're not just recording a memory — you're giving someone a moment they'll return to.",
	},
	{
		title: "What should they feel?",
		body: "Close your eyes for a second. What do you want them to feel when they hear this?",
	},
	{
		title: "The more you say now",
		body: "The more you say now, the more they'll have later. Simple as that.",
	},
	{
		title: "The next five minutes",
		body: "What if the next five minutes became the thing they replay for the rest of their life?",
	},
];

/** One-off celebration fired right after a user saves their very first entry. */
export const FIRST_ENTRY_MESSAGES: LocalMessage[] = [
	{
		title: "You did it",
		body: "You just started something they'll have forever.",
	},
	{
		title: "The hardest one is done",
		body: "Entry #1 is done. That's the hardest one — it only gets easier from here.",
	},
	{
		title: "A piece of you",
		body: "You just gave someone a piece of you they'll always have.",
	},
	{
		title: "The first page",
		body: "That's the first page of a story only you can tell.",
	},
	{
		title: "One entry down",
		body: "One entry down. Imagine what this looks like in ten years.",
	},
];

/** Pick a random message from a pool (used for the first-entry celebration). */
export function randomMessage(pool: LocalMessage[]): LocalMessage {
	const index = Math.floor(Math.random() * pool.length);
	return (
		pool[index] ??
		pool[0] ?? { title: "Legacy Building", body: "Open your journal." }
	);
}

/** Return a shuffled copy of a pool (used to vary the daily prompt order). */
export function shuffled<T>(items: T[]): T[] {
	const copy = [...items];
	for (let i = copy.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[copy[i], copy[j]] = [copy[j] as T, copy[i] as T];
	}
	return copy;
}
