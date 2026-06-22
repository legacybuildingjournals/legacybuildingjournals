import { internal } from "../_generated/api";
import type { MutationCtx } from "../_generated/server";

/** Where the trial originated — decides which table the send-time guard reads. */
export type TrialReminderSource = "stripe" | "revenuecat";

/** Day-5 of a 7-day trial = 2 days before the trial ends. */
const REMINDER_LEAD_MS = 2 * 24 * 60 * 60 * 1000;

/**
 * Schedule the day-5 trial reminder for a user. Idempotent: no-op if a job is
 * already pending, the email was already sent, or the user row doesn't exist.
 * Provider-agnostic — `trialEndMs` must be in milliseconds.
 *
 * Plain helper (not a mutation) so it can be called directly from another
 * mutation (RevenueCat webhook) without an illegal mutation→mutation call.
 */
export async function scheduleTrialReminderForUser(
	ctx: MutationCtx,
	args: {
		clerkUserId: string;
		trialEndMs: number;
		source: TrialReminderSource;
	},
): Promise<void> {
	const user = await ctx.db
		.query("users")
		.withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkUserId))
		.unique();
	if (!user) return;
	if (user.trialReminderJobId || user.trialReminderEmailSent === true) return;

	// Never schedule in the past; give a small buffer for very short trials.
	const sendAt = Math.max(
		args.trialEndMs - REMINDER_LEAD_MS,
		Date.now() + 5_000,
	);

	const jobId = await ctx.scheduler.runAt(
		sendAt,
		internal.email.actions.sendTrialDayFiveReminder,
		{ clerkUserId: args.clerkUserId, source: args.source },
	);
	await ctx.db.patch(user._id, {
		trialReminderJobId: jobId,
		trialReminderEmailSent: false,
	});
}

/**
 * Cancel a pending trial reminder (user converted/churned before day 5).
 * Leaves `trialReminderEmailSent` as-is — only the pending job is dropped.
 */
export async function cancelTrialReminderForUser(
	ctx: MutationCtx,
	clerkUserId: string,
): Promise<void> {
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
}

/** Mark the reminder as sent: clears the (now-finished) job and flips the flag. */
export async function markTrialReminderSentForUser(
	ctx: MutationCtx,
	clerkUserId: string,
): Promise<void> {
	const user = await ctx.db
		.query("users")
		.withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkUserId))
		.unique();
	if (!user) return;
	await ctx.db.patch(user._id, {
		trialReminderJobId: undefined,
		trialReminderEmailSent: true,
	});
}
