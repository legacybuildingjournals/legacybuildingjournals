import { v } from "convex/values";

import { internalMutation } from "../_generated/server";
import {
	iapSubscriptionStatusValidator,
	planIntervalValidator,
	subscriptionProviderValidator,
} from "../schema";

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
	},
});
