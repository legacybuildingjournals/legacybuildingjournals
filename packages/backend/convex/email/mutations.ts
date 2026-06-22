import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import {
	cancelTrialReminderForUser,
	markTrialReminderSentForUser,
	scheduleTrialReminderForUser,
} from "./helpers";

const sourceValidator = v.union(v.literal("stripe"), v.literal("revenuecat"));

/** Schedule the day-5 trial reminder. Idempotent. `trialEndMs` is milliseconds. */
export const scheduleTrialReminder = internalMutation({
	args: {
		clerkUserId: v.string(),
		trialEndMs: v.number(),
		source: sourceValidator,
	},
	handler: (ctx, args) => scheduleTrialReminderForUser(ctx, args),
});

/** Cancel a pending trial reminder (called when the user converts before day 5). */
export const cancelTrialReminder = internalMutation({
	args: { clerkUserId: v.string() },
	handler: (ctx, { clerkUserId }) =>
		cancelTrialReminderForUser(ctx, clerkUserId),
});

/** Mark the reminder sent — clears the job id and sets trialReminderEmailSent. */
export const markTrialReminderSent = internalMutation({
	args: { clerkUserId: v.string() },
	handler: (ctx, { clerkUserId }) =>
		markTrialReminderSentForUser(ctx, clerkUserId),
});
