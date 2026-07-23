/**
 * Journal background rules.
 *
 * Users pick a background from a full colour picker, so the server validates
 * the *shape* of the value rather than matching it against a fixed palette.
 *
 * Deliberately dependency-free: both clients import this too, so it must stay
 * safe to pull into a React Native bundle. (It can't live in `packages/ui` —
 * that module pulls in bundler-resolved image assets the Convex runtime can't
 * resolve.)
 */

/** `#rrggbb`, or `#rrggbbaa` when the colour carries alpha. */
const HEX_COLOR = /^#([0-9a-f]{6}|[0-9a-f]{8})$/i;

export const DEFAULT_JOURNAL_BACKGROUND = "#0f94c0";

export function isJournalBackgroundColor(value: string): boolean {
	return HEX_COLOR.test(value);
}

/**
 * Normalises what a client sends so stored values stay comparable — lowercase,
 * and with a redundant fully-opaque alpha channel trimmed.
 */
export function normalizeJournalBackgroundColor(value: string): string {
	const lower = value.trim().toLowerCase();
	return lower.length === 9 && lower.endsWith("ff") ? lower.slice(0, 7) : lower;
}

export function hasCustomJournalBackground(journal: {
	backgroundColor?: string | null;
	backgroundImageUrl?: string | null;
}): boolean {
	return (
		Boolean(journal.backgroundColor) || Boolean(journal.backgroundImageUrl)
	);
}
