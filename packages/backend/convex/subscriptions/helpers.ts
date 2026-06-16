import type { Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

type Ctx = QueryCtx | MutationCtx;
type IapSubscription = Doc<"subscriptions">;

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
