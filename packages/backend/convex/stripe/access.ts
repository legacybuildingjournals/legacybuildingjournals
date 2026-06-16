import { ConvexError } from "convex/values";

import type { MutationCtx, QueryCtx } from "../_generated/server";
import { getActiveIapSubscription } from "../subscriptions/helpers";
import {
	FEATURE_ACCESS_STATUSES,
	listSubscriptionsForClerkUser,
} from "./helpers";

type AccessCtx = QueryCtx | MutationCtx;

export async function userHasPaidFeatureAccess(
	ctx: AccessCtx,
	clerkUserId: string,
): Promise<boolean> {
	const user = await ctx.db
		.query("users")
		.withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkUserId))
		.unique();

	if (!user) return false;
	if (user.role === "admin") return true;
	if (user.betaAccess === true) return true;

	// Native IAP (Apple/Google) subscribers — synced from RevenueCat. This makes
	// access work cross-platform: someone who subscribed in the app still has
	// access on the web, and vice versa.
	const iap = await getActiveIapSubscription(ctx, clerkUserId);
	if (iap) return true;

	// Never trust the mirrored `users.subscriptionStatus` alone — it can lag after
	// cancel/reset. Require a live Stripe subscription instead.
	const subscriptions = await listSubscriptionsForClerkUser(ctx, clerkUserId);

	return subscriptions.some((subscription) =>
		FEATURE_ACCESS_STATUSES.has(subscription.status),
	);
}

export async function requirePaidFeatureAccess(
	ctx: AccessCtx,
	clerkUserId: string,
): Promise<void> {
	if (await userHasPaidFeatureAccess(ctx, clerkUserId)) return;

	throw new ConvexError({
		code: "SUBSCRIPTION_REQUIRED",
		message:
			"Subscribe and complete payment to use journal features. Visit Billing to continue.",
	});
}
