import type { Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import {
	FEATURE_ACCESS_STATUSES,
	listSubscriptionsForClerkUser,
} from "../stripe/helpers";

type Ctx = QueryCtx | MutationCtx;
type IapSubscription = Doc<"subscriptions">;
type MirrorStatus = NonNullable<Doc<"users">["subscriptionStatus"]>;

/**
 * Whether a stored IAP subscription currently grants paid access.
 * `canceled` still grants access until the paid period ends (auto-renew is off
 * but the user keeps Pro until `currentPeriodEnd`).
 */
export function iapGrantsAccess(sub: IapSubscription, now: number): boolean {
	switch (sub.status) {
		case "active":
		case "trialing":
		case "grace_period":
			return true;
		case "canceled":
			return sub.currentPeriodEnd != null && sub.currentPeriodEnd > now;
		default:
			return false; // expired
	}
}

/**
 * The user's active Apple/Google subscription (the one to surface), or null.
 * Picks the row with the furthest period end when several exist.
 */
export async function getActiveIapSubscription(
	ctx: Ctx,
	clerkUserId: string,
): Promise<IapSubscription | null> {
	const subs = await ctx.db
		.query("subscriptions")
		.withIndex("by_userId", (q) => q.eq("userId", clerkUserId))
		.collect();

	const now = Date.now();
	const granting = subs.filter((s) => iapGrantsAccess(s, now));
	if (granting.length === 0) return null;

	return (
		granting.sort(
			(a, b) => (b.currentPeriodEnd ?? 0) - (a.currentPeriodEnd ?? 0),
		)[0] ?? null
	);
}

/**
 * Map a granting IAP subscription status onto the `users.subscriptionStatus`
 * mirror. `expired` never grants access, so it maps to `none`; every other IAP
 * status has a 1:1 counterpart in the mirror union.
 */
export function iapStatusToMirror(
	status: IapSubscription["status"],
): MirrorStatus {
	return status === "expired" ? "none" : status;
}

/**
 * Recompute the cheap `users.subscriptionStatus` display mirror from the user's
 * live IAP (RevenueCat) subscription, so the admin list views / filters reflect
 * Apple/Google subscribers — not just the detail dialog's live access check.
 *
 * Rules:
 * - If an IAP subscription currently grants access, write its mapped status.
 *   This is an "on" signal and is always safe to write.
 * - If IAP no longer grants access, only downgrade the mirror to `none` when the
 *   user has no live Stripe subscription either — never clobber a paying Stripe
 *   customer's mirror (Stripe owns it via `stripe/mutations.mirrorSubscriptionStatus`).
 *
 * The mirror is a display/filter hint only; `userHasPaidFeatureAccess` remains the
 * authoritative gate and already reads both Stripe and IAP.
 */
export async function syncUserSubscriptionMirror(
	ctx: MutationCtx,
	clerkUserId: string,
): Promise<void> {
	const user = await ctx.db
		.query("users")
		.withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkUserId))
		.unique();
	if (!user) return;

	const activeIap = await getActiveIapSubscription(ctx, clerkUserId);
	if (activeIap) {
		const next = iapStatusToMirror(activeIap.status);
		if (user.subscriptionStatus !== next) {
			await ctx.db.patch(user._id, { subscriptionStatus: next });
		}
		return;
	}

	// IAP no longer grants access. Leave a paying Stripe customer's mirror alone.
	const stripeSubs = await listSubscriptionsForClerkUser(ctx, clerkUserId);
	if (stripeSubs.some((s) => FEATURE_ACCESS_STATUSES.has(s.status))) return;

	// No live IAP and no live Stripe → clear a previously-granted mirror. Leave
	// users who never had a mirror (undefined) or already `none` untouched.
	if (user.subscriptionStatus && user.subscriptionStatus !== "none") {
		await ctx.db.patch(user._id, { subscriptionStatus: "none" });
	}
}
