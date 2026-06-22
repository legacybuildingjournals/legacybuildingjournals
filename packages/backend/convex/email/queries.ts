import { v } from "convex/values";
import { internalQuery } from "../_generated/server";
import { getActiveIapSubscription } from "../subscriptions/helpers";

/**
 * Everything the day-5 reminder action needs, with a provider-correct "is the
 * user still trialing?" check:
 *   - stripe: the mirrored `users.subscriptionStatus`
 *   - revenuecat: the live IAP row in the `subscriptions` table
 */
export const getTrialReminderContext = internalQuery({
	args: {
		clerkUserId: v.string(),
		source: v.union(v.literal("stripe"), v.literal("revenuecat")),
	},
	handler: async (ctx, { clerkUserId, source }) => {
		const user = await ctx.db
			.query("users")
			.withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkUserId))
			.unique();
		if (!user) return null;

		let isTrialing: boolean;
		// Which store/platform manages this subscription — drives the email's
		// "manage subscription" link. Native must point at Apple/Google, not web.
		let provider: "stripe" | "apple" | "google";
		if (source === "revenuecat") {
			const iap = await getActiveIapSubscription(ctx, clerkUserId);
			isTrialing = iap?.status === "trialing";
			provider = iap?.provider === "google" ? "google" : "apple";
		} else {
			isTrialing = user.subscriptionStatus === "trialing";
			provider = "stripe";
		}

		return {
			email: user.email,
			name: user.name,
			isTrialing,
			provider,
			alreadySent: user.trialReminderEmailSent === true,
		};
	},
});
