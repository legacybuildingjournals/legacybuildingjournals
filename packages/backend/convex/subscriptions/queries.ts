import { query } from "../_generated/server";
import {
	FEATURE_ACCESS_STATUSES,
	listSubscriptionsForClerkUser,
} from "../stripe/helpers";
import { getActiveIapSubscription } from "./helpers";

/** Where the active subscription can be managed (cancel/upgrade). */
export type ManageVia = "app_store" | "play_store" | "stripe" | "none";

export type Entitlement = {
	hasAccess: boolean;
	/** null for admin/beta or no subscription. */
	provider: "apple" | "google" | "stripe" | null;
	manageVia: ManageVia;
	status: string | null;
	isTrial: boolean;
	interval: "monthly" | "annual" | null;
	/** Unix ms when the current period ends, normalized across providers. */
	currentPeriodEnd: number | null;
	willRenew: boolean | null;
};

const NO_ACCESS: Entitlement = {
	hasAccess: false,
	provider: null,
	manageVia: "none",
	status: null,
	isTrial: false,
	interval: null,
	currentPeriodEnd: null,
	willRenew: null,
};

/**
 * Unified subscription entitlement across all providers. Resolution order:
 *   1. admin / beta  → full access, nothing to manage
 *   2. Apple / Google IAP (RevenueCat-synced) → takes precedence on mobile
 *   3. Stripe (web)
 *
 * `manageVia` tells the UI where the user must cancel/upgrade — Apple & Google
 * forbid managing IAP subscriptions outside their stores, and a Stripe sub
 * can't be managed inside the native app.
 */
export const getEntitlement = query({
	args: {},
	handler: async (ctx): Promise<Entitlement> => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) return NO_ACCESS;
		const clerkUserId = identity.subject;

		const user = await ctx.db
			.query("users")
			.withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkUserId))
			.unique();

		// 1. Admin / beta bypass — full access, nothing to manage.
		if (user?.role === "admin" || user?.betaAccess === true) {
			return {
				...NO_ACCESS,
				hasAccess: true,
				status: "active",
			};
		}

		// 2. Apple / Google IAP — takes precedence over Stripe.
		const iap = await getActiveIapSubscription(ctx, clerkUserId);
		if (iap) {
			return {
				hasAccess: true,
				provider: iap.provider,
				manageVia: iap.provider === "apple" ? "app_store" : "play_store",
				status: iap.status,
				isTrial: iap.isTrial ?? false,
				interval: iap.interval ?? null,
				currentPeriodEnd: iap.currentPeriodEnd ?? null,
				willRenew: iap.willRenew ?? null,
			};
		}

		// 3. Stripe (web).
		const stripeSubs = await listSubscriptionsForClerkUser(ctx, clerkUserId);
		const live = stripeSubs.filter((s) =>
			FEATURE_ACCESS_STATUSES.has(s.status),
		);
		if (live.length > 0) {
			const sub = [...live].sort(
				(a, b) => b.currentPeriodEnd - a.currentPeriodEnd,
			)[0];
			const product = await ctx.db
				.query("products")
				.withIndex("by_stripe_price_id", (q) =>
					q.eq("stripePriceId", sub.priceId),
				)
				.unique();
			return {
				hasAccess: true,
				provider: "stripe",
				manageVia: "stripe",
				status: sub.status,
				isTrial: sub.status === "trialing",
				interval: product?.interval ?? null,
				// Stripe stores epoch seconds; normalize to ms.
				currentPeriodEnd: sub.currentPeriodEnd * 1000,
				willRenew: !sub.cancelAtPeriodEnd,
			};
		}

		return NO_ACCESS;
	},
});
