import { v } from "convex/values";

import { internalMutation } from "../_generated/server";
import {
	cancelTrialReminderForUser,
	scheduleTrialReminderForUser,
} from "../email/helpers";
import {
	iapSubscriptionStatusValidator,
	planIntervalValidator,
	subscriptionProviderValidator,
} from "../schema";
import { syncUserSubscriptionMirror } from "../subscriptions/helpers";

/**
 * Upsert a user's native (Apple/Google) subscription from a RevenueCat webhook.
 * Internal only — invoked by the HTTP webhook handler, never the client.
 *
 * `appUserId` is the RevenueCat app user id. Once the app calls
 * `Purchases.logIn(clerkId)`, this equals the Clerk id and maps to a user.
 * Anonymous ids ($RCAnonymousID:...) can't be mapped, so we skip them.
 */
export const upsertFromWebhook = internalMutation({
	args: {
		appUserId: v.string(),
		provider: subscriptionProviderValidator,
		status: iapSubscriptionStatusValidator,
		interval: v.optional(planIntervalValidator),
		storeProductId: v.string(),
		currentPeriodEnd: v.optional(v.number()),
		willRenew: v.optional(v.boolean()),
		isTrial: v.optional(v.boolean()),
		environment: v.optional(
			v.union(v.literal("sandbox"), v.literal("production")),
		),
	},
	handler: async (ctx, args) => {
		if (args.appUserId.startsWith("$RCAnonymousID")) {
			console.warn(
				"[RevenueCat] Skipping webhook for anonymous user — app did not call Purchases.logIn(clerkId).",
			);
			return;
		}

		const existing = await ctx.db
			.query("subscriptions")
			.withIndex("by_userId", (q) => q.eq("userId", args.appUserId))
			.first();

		const fields = {
			userId: args.appUserId,
			rcAppUserId: args.appUserId,
			provider: args.provider,
			status: args.status,
			interval: args.interval,
			storeProductId: args.storeProductId,
			currentPeriodEnd: args.currentPeriodEnd,
			willRenew: args.willRenew,
			isTrial: args.isTrial,
			environment: args.environment,
			updatedAt: Date.now(),
		};

		if (existing) {
			await ctx.db.patch(existing._id, fields);
		} else {
			await ctx.db.insert("subscriptions", fields);
		}

		// `appUserId` is the Clerk id once the app called Purchases.logIn(clerkId),
		// so it maps directly to a `users` row for the reminder helpers.
		const clerkUserId = args.appUserId;

		// Reflect the new IAP status on the cheap `users.subscriptionStatus` mirror
		// so admin list views / filters show Apple/Google subscribers.
		await syncUserSubscriptionMirror(ctx, clerkUserId);

		if (args.status === "trialing" && args.currentPeriodEnd) {
			// Trial active → schedule the day-5 reminder (idempotent).
			await scheduleTrialReminderForUser(ctx, {
				clerkUserId,
				// RevenueCat already gives expiration in milliseconds.
				trialEndMs: args.currentPeriodEnd,
				source: "revenuecat",
			});
		} else if (existing?.status === "trialing" && args.status !== "trialing") {
			// Converted to paid (or churned) before day 5 → drop the pending email.
			await cancelTrialReminderForUser(ctx, clerkUserId);
		}
	},
});

/**
 * Expire a user's native subscription(s). Used for the *losing* side of a
 * RevenueCat TRANSFER: when a store purchase moves to a different app_user_id
 * (e.g. a restore on a new account, same Apple ID), the old account must stop
 * showing Pro. No-op when there's no row. Internal only.
 */
export const expireByAppUserId = internalMutation({
	args: { appUserId: v.string() },
	handler: async (ctx, { appUserId }) => {
		if (appUserId.startsWith("$RCAnonymousID")) return;

		const rows = await ctx.db
			.query("subscriptions")
			.withIndex("by_userId", (q) => q.eq("userId", appUserId))
			.collect();

		for (const row of rows) {
			if (row.status === "expired") continue;
			await ctx.db.patch(row._id, {
				status: "expired",
				willRenew: false,
				updatedAt: Date.now(),
			});
		}

		// The old account no longer has a live trial → drop any pending reminder.
		await cancelTrialReminderForUser(ctx, appUserId);

		// Recompute the display mirror — clears it to `none` unless the user still
		// has a live Stripe subscription.
		await syncUserSubscriptionMirror(ctx, appUserId);
	},
});
