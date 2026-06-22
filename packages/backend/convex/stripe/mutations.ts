import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import { planIntervalValidator } from "../schema";
import { mapStripeStatus } from "./config";

/** Persist the Stripe customer id on the Convex user for fast lookups. */
export const linkStripeCustomer = internalMutation({
	args: {
		clerkUserId: v.string(),
		stripeCustomerId: v.string(),
	},
	handler: async (ctx, { clerkUserId, stripeCustomerId }) => {
		const user = await ctx.db
			.query("users")
			.withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkUserId))
			.unique();
		if (!user) return;
		if (user.stripeCustomerId !== stripeCustomerId) {
			await ctx.db.patch(user._id, { stripeCustomerId });
		}
	},
});

/**
 * Mirror the authoritative subscription status (synced by the Stripe component)
 * onto the `users` table so the UI and access gates can read it cheaply.
 */
export const mirrorSubscriptionStatus = internalMutation({
	args: {
		clerkUserId: v.optional(v.string()),
		stripeCustomerId: v.optional(v.string()),
		stripeStatus: v.string(),
	},
	handler: async (ctx, args) => {
		let user = null;

		if (args.clerkUserId) {
			user = await ctx.db
				.query("users")
				.withIndex("by_clerk_id", (q) =>
					q.eq("clerkId", args.clerkUserId as string),
				)
				.unique();
		}

		if (!user && args.stripeCustomerId) {
			user = await ctx.db
				.query("users")
				.withIndex("by_stripe_customer_id", (q) =>
					q.eq("stripeCustomerId", args.stripeCustomerId as string),
				)
				.unique();
		}

		if (!user) return;

		const newStatus = mapStripeStatus(args.stripeStatus);

		// If converting out of trial before day-5 email fires, cancel and clear it
		const clearReminder =
			user.subscriptionStatus === "trialing" &&
			newStatus !== "trialing" &&
			user.trialReminderJobId != null;

		if (clearReminder && user.trialReminderJobId) {
			try {
				await ctx.scheduler.cancel(user.trialReminderJobId);
			} catch {
				// Already ran or was canceled — nothing to do
			}
		}

		await ctx.db.patch(user._id, {
			subscriptionStatus: newStatus,
			...(clearReminder ? { trialReminderJobId: undefined } : {}),
			...(args.stripeCustomerId &&
			user.stripeCustomerId !== args.stripeCustomerId
				? { stripeCustomerId: args.stripeCustomerId }
				: {}),
		});
	},
});

/** Record a deferred plan switch so the billing UI can show "switches on [date]". */
export const setPendingPlanChange = internalMutation({
	args: {
		clerkUserId: v.string(),
		interval: planIntervalValidator,
		effectiveAt: v.number(),
	},
	handler: async (ctx, { clerkUserId, interval, effectiveAt }) => {
		const user = await ctx.db
			.query("users")
			.withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkUserId))
			.unique();
		if (!user) return;
		await ctx.db.patch(user._id, {
			pendingPlanChange: { interval, effectiveAt },
		});
	},
});

/** Clear any recorded pending plan switch (e.g. after an immediate upgrade). */
export const clearPendingPlanChange = internalMutation({
	args: { clerkUserId: v.string() },
	handler: async (ctx, { clerkUserId }) => {
		const user = await ctx.db
			.query("users")
			.withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkUserId))
			.unique();
		if (!user || user.pendingPlanChange === undefined) return;
		await ctx.db.patch(user._id, { pendingPlanChange: undefined });
	},
});
