import type { MutationCtx } from "../_generated/server";

/** Default preferences applied the first time a device registers a push token. */
export const DEFAULT_NOTIFICATION_PREFERENCES = {
	dailyPrompts: true,
	inactivity: true,
	exportReminders: true,
	dailyPromptHour: 9,
	dailyPromptMinute: 0,
} as const;

/**
 * Record that the signed-in user just created a journal entry. Bumps
 * `lastEntryAt`/`entryCount` and clears the inactivity throttle so a future
 * lapse can trigger a reminder again. Returns whether this was their first
 * entry so the client can fire the local first-entry celebration.
 *
 * Plain helper (not a mutation) so it can be called directly from the entry
 * `create` mutation without an illegal mutation→mutation call.
 */
export async function recordEntryCreated(
	ctx: MutationCtx,
	userId: string,
): Promise<{ isFirstEntry: boolean }> {
	const user = await ctx.db
		.query("users")
		.withIndex("by_clerk_id", (q) => q.eq("clerkId", userId))
		.unique();
	if (!user) return { isFirstEntry: false };

	const now = Date.now();

	// `entryCount` is optional and absent for users created before this feature.
	// Backfill from the real entry count once (this runs after the new entry is
	// inserted, so the count already includes it), then increment cheaply after.
	let total: number;
	if (user.entryCount === undefined) {
		const existing = await ctx.db
			.query("journalEntries")
			.withIndex("by_userId", (q) => q.eq("userId", userId))
			.collect();
		total = existing.length;
	} else {
		total = user.entryCount + 1;
	}

	await ctx.db.patch(user._id, {
		lastEntryAt: now,
		entryCount: total,
		lastInactivityPushAt: undefined,
	});

	return { isFirstEntry: total === 1 };
}
