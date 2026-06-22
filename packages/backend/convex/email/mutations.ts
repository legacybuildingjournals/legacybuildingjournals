import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalMutation } from "../_generated/server";

/**
 * Schedule the day-5 trial reminder for a user. Idempotent — if a job is already
 * stored on the user row it won't schedule a second one.
 */
export const scheduleTrialReminder = internalMutation({
	args: {
		clerkUserId: v.string(),
		/** Unix seconds — Stripe's `trial_end` value. */
		trialEndSeconds: v.number(),
	},
	handler: async (ctx, { clerkUserId, trialEndSeconds }) => {
		const user = await ctx.db
			.query("users")
			.withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkUserId))
			.unique();
		if (!user || user.trialReminderJobId) return;

		// Send on day 5: 2 days before trial_end. Never in the past.
		const day5Ms = (trialEndSeconds - 2 * 24 * 60 * 60) * 1000;
		const sendAt = Math.max(day5Ms, Date.now() + 5_000);

		const jobId = await ctx.scheduler.runAt(
			sendAt,
			internal.email.actions.sendTrialDayFiveReminder,
			{ clerkUserId },
		);
		await ctx.db.patch(user._id, { trialReminderJobId: jobId });
	},
});

/** Cancel a pending trial reminder (called when the user converts before day 5). */
export const cancelTrialReminder = internalMutation({
	args: { clerkUserId: v.string() },
	handler: async (ctx, { clerkUserId }) => {
		const user = await ctx.db
			.query("users")
			.withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkUserId))
			.unique();
		if (!user?.trialReminderJobId) return;

		try {
			await ctx.scheduler.cancel(user.trialReminderJobId);
		} catch {
			// Already ran or was canceled — nothing to do
		}
		await ctx.db.patch(user._id, { trialReminderJobId: undefined });
	},
});
