import { internalQuery, type QueryCtx, query } from "../_generated/server";
import { DEFAULT_NOTIFICATION_PREFERENCES } from "./helpers";

/** Days of inactivity before we send a re-engagement push. */
const INACTIVITY_THRESHOLD_MS = 3 * 24 * 60 * 60 * 1000;
/** Minimum gap between two inactivity pushes to the same user. */
const INACTIVITY_COOLDOWN_MS = 3 * 24 * 60 * 60 * 1000;
/** Entries a user must have before export reminders make sense. */
const EXPORT_MIN_ENTRIES = 3;
/** Minimum gap between two export reminders to the same user. */
const EXPORT_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

type PushTarget = { clerkUserId: string; tokens: string[] };

/**
 * Group every push token by user. Bounds the sweep to devices that actually
 * registered a token instead of scanning the whole users table.
 */
async function tokensByUser(ctx: QueryCtx): Promise<Map<string, string[]>> {
	const rows = await ctx.db.query("pushTokens").collect();
	const map = new Map<string, string[]>();
	for (const row of rows) {
		const list = map.get(row.userId) ?? [];
		list.push(row.token);
		map.set(row.userId, list);
	}
	return map;
}

/** The signed-in user's notification preferences (defaults when unset). */
export const getMyPreferences = query({
	args: {},
	handler: async (ctx) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) return null;
		const user = await ctx.db
			.query("users")
			.withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
			.unique();
		if (!user) return null;
		return (
			user.notificationPreferences ?? {
				...DEFAULT_NOTIFICATION_PREFERENCES,
				updatedAt: 0,
			}
		);
	},
});

/** Internal: users who have lapsed and opted in to inactivity reminders. */
export const getInactivityTargets = internalQuery({
	args: {},
	handler: async (ctx): Promise<PushTarget[]> => {
		const now = Date.now();
		const byUser = await tokensByUser(ctx);
		const targets: PushTarget[] = [];

		for (const [clerkUserId, tokens] of byUser) {
			const user = await ctx.db
				.query("users")
				.withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkUserId))
				.unique();
			if (!user) continue;
			if (user.accountStatus === "suspended") continue;
			const prefs = user.notificationPreferences;
			if (!prefs?.inactivity) continue;
			// Only remind people who have journaled before but have gone quiet.
			if (!user.lastEntryAt) continue;
			if (now - user.lastEntryAt < INACTIVITY_THRESHOLD_MS) continue;
			if (
				user.lastInactivityPushAt &&
				now - user.lastInactivityPushAt < INACTIVITY_COOLDOWN_MS
			) {
				continue;
			}
			targets.push({ clerkUserId, tokens });
		}

		return targets;
	},
});

/** Internal: users with entries worth backing up who opted in to export reminders. */
export const getExportTargets = internalQuery({
	args: {},
	handler: async (ctx): Promise<PushTarget[]> => {
		const now = Date.now();
		const byUser = await tokensByUser(ctx);
		const targets: PushTarget[] = [];

		for (const [clerkUserId, tokens] of byUser) {
			const user = await ctx.db
				.query("users")
				.withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkUserId))
				.unique();
			if (!user) continue;
			if (user.accountStatus === "suspended") continue;
			const prefs = user.notificationPreferences;
			if (!prefs?.exportReminders) continue;
			if ((user.entryCount ?? 0) < EXPORT_MIN_ENTRIES) continue;
			if (
				user.lastExportReminderAt &&
				now - user.lastExportReminderAt < EXPORT_COOLDOWN_MS
			) {
				continue;
			}
			targets.push({ clerkUserId, tokens });
		}

		return targets;
	},
});
