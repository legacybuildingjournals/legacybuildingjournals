import { ConvexError, v } from "convex/values";

import type { Doc } from "../_generated/dataModel";
import {
	internalMutation,
	type MutationCtx,
	mutation,
} from "../_generated/server";
import { DEFAULT_NOTIFICATION_PREFERENCES } from "./helpers";

const platformValidator = v.union(
	v.literal("ios"),
	v.literal("android"),
	v.literal("web"),
);

/** Resolve the signed-in Convex user row, throwing when unauthenticated/unregistered. */
async function requireUser(ctx: MutationCtx): Promise<Doc<"users">> {
	const identity = await ctx.auth.getUserIdentity();
	if (!identity) {
		throw new ConvexError({
			code: "UNAUTHENTICATED",
			message: "You must be signed in.",
		});
	}
	const user = await ctx.db
		.query("users")
		.withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
		.unique();
	if (!user) {
		throw new ConvexError({
			code: "USER_NOT_REGISTERED",
			message: "No Convex user found for this account yet.",
		});
	}
	return user;
}

/**
 * Upsert the Expo push token for the current device. Called after the user
 * grants notification permission. Idempotent on `token`. On the very first
 * registration for a user (no preferences yet) we seed sensible opt-in
 * defaults so the server-driven reminders work out of the box.
 */
export const registerPushToken = mutation({
	args: {
		token: v.string(),
		platform: platformValidator,
		deviceName: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const user = await requireUser(ctx);
		const now = Date.now();

		const existing = await ctx.db
			.query("pushTokens")
			.withIndex("by_token", (q) => q.eq("token", args.token))
			.unique();

		if (existing) {
			await ctx.db.patch(existing._id, {
				userId: user.clerkId,
				platform: args.platform,
				deviceName: args.deviceName,
				updatedAt: now,
			});
		} else {
			await ctx.db.insert("pushTokens", {
				userId: user.clerkId,
				token: args.token,
				platform: args.platform,
				deviceName: args.deviceName,
				updatedAt: now,
			});
		}

		if (!user.notificationPreferences) {
			await ctx.db.patch(user._id, {
				notificationPreferences: {
					...DEFAULT_NOTIFICATION_PREFERENCES,
					updatedAt: now,
				},
			});
		}
	},
});

/** Remove a token (user disabled notifications or signed out on this device). */
export const removePushToken = mutation({
	args: { token: v.string() },
	handler: async (ctx, args) => {
		const user = await requireUser(ctx);
		const existing = await ctx.db
			.query("pushTokens")
			.withIndex("by_token", (q) => q.eq("token", args.token))
			.unique();
		// Only delete tokens owned by the caller.
		if (existing && existing.userId === user.clerkId) {
			await ctx.db.delete(existing._id);
		}
	},
});

/** Update notification preferences. Merges into any existing preferences. */
export const setNotificationPreferences = mutation({
	args: {
		dailyPrompts: v.optional(v.boolean()),
		inactivity: v.optional(v.boolean()),
		exportReminders: v.optional(v.boolean()),
		dailyPromptHour: v.optional(v.number()),
		dailyPromptMinute: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const user = await requireUser(ctx);
		const current = user.notificationPreferences ?? {
			...DEFAULT_NOTIFICATION_PREFERENCES,
			updatedAt: 0,
		};

		const hour = args.dailyPromptHour ?? current.dailyPromptHour;
		const minute = args.dailyPromptMinute ?? current.dailyPromptMinute;

		await ctx.db.patch(user._id, {
			notificationPreferences: {
				dailyPrompts: args.dailyPrompts ?? current.dailyPrompts,
				inactivity: args.inactivity ?? current.inactivity,
				exportReminders: args.exportReminders ?? current.exportReminders,
				dailyPromptHour: Math.min(23, Math.max(0, Math.floor(hour))),
				dailyPromptMinute: Math.min(59, Math.max(0, Math.floor(minute))),
				updatedAt: Date.now(),
			},
		});
	},
});

/** Internal: stamp the inactivity throttle after a reminder is sent. */
export const markInactivityPushSent = internalMutation({
	args: { clerkUserId: v.string() },
	handler: async (ctx, { clerkUserId }) => {
		const user = await ctx.db
			.query("users")
			.withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkUserId))
			.unique();
		if (!user) return;
		await ctx.db.patch(user._id, { lastInactivityPushAt: Date.now() });
	},
});

/** Internal: stamp the export-reminder throttle after a reminder is sent. */
export const markExportReminderSent = internalMutation({
	args: { clerkUserId: v.string() },
	handler: async (ctx, { clerkUserId }) => {
		const user = await ctx.db
			.query("users")
			.withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkUserId))
			.unique();
		if (!user) return;
		await ctx.db.patch(user._id, { lastExportReminderAt: Date.now() });
	},
});

/** Internal: drop tokens Expo reported as unregistered (DeviceNotRegistered). */
export const removeTokensByValue = internalMutation({
	args: { tokens: v.array(v.string()) },
	handler: async (ctx, { tokens }) => {
		for (const token of tokens) {
			const row = await ctx.db
				.query("pushTokens")
				.withIndex("by_token", (q) => q.eq("token", token))
				.unique();
			if (row) await ctx.db.delete(row._id);
		}
	},
});
