import { v } from "convex/values";

import { components } from "../_generated/api";
import { query } from "../_generated/server";
import { getActiveIapSubscription } from "../subscriptions/helpers";
import { userHasPaidFeatureAccess } from "./access";
import { listSubscriptionsForClerkUser } from "./helpers";

type ComponentSubscription = {
	stripeSubscriptionId: string;
	stripeCustomerId: string;
	status: string;
	priceId: string;
	quantity?: number;
	currentPeriodEnd: number;
	cancelAtPeriodEnd: boolean;
	cancelAt?: number;
};

/** Statuses we treat as an active subscription in the UI. */
const LIVE_SUBSCRIPTION_STATUSES = new Set([
	"active",
	"trialing",
	"past_due",
	"unpaid",
]);

/** Lower is more relevant when picking the subscription to surface in the UI. */
function statusRank(status: string): number {
	switch (status) {
		case "active":
		case "trialing":
			return 0;
		case "past_due":
		case "unpaid":
			return 1;
		default:
			return 2;
	}
}

/**
 * The current user's most relevant subscription, enriched with plan details from
 * the `products` table. Reads billing data from the Stripe component's synced tables.
 */
export const getMySubscription = query({
	args: {},
	handler: async (ctx) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) return null;

		// Native IAP (Apple/Google) takes precedence — synced from RevenueCat.
		// Shape it like a Stripe subscription so all consumers (account Plan
		// Status, billing page) work unchanged; `provider` drives the UI to show
		// "manage in the store" and hide Stripe-only cancel/upgrade controls.
		const iap = await getActiveIapSubscription(ctx, identity.subject);
		if (iap) {
			// IAP "canceled" still has access until period end → mirror Stripe's
			// (status active + cancelAtPeriodEnd) so the UI reads it correctly.
			const displayStatus =
				iap.status === "trialing"
					? "trialing"
					: iap.status === "grace_period"
						? "past_due"
						: "active";
			return {
				stripeSubscriptionId: iap._id,
				provider: iap.provider,
				status: displayStatus,
				interval: iap.interval ?? null,
				priceId: "",
				// Stripe consumers expect epoch seconds.
				currentPeriodEnd: iap.currentPeriodEnd
					? Math.floor(iap.currentPeriodEnd / 1000)
					: 0,
				cancelAtPeriodEnd: iap.willRenew === false,
				cancelAt: null,
				// No Stripe product for an IAP sub; UI falls back to the interval name.
				plan: null,
				pendingPlanChange: null,
			};
		}

		const subscriptions: ComponentSubscription[] =
			await listSubscriptionsForClerkUser(ctx, identity.subject);
		if (subscriptions.length === 0) return null;

		const liveSubscriptions = subscriptions.filter((sub) =>
			LIVE_SUBSCRIPTION_STATUSES.has(sub.status),
		);
		if (liveSubscriptions.length === 0) return null;

		const [subscription] = [...liveSubscriptions].sort(
			(a, b) =>
				statusRank(a.status) - statusRank(b.status) ||
				b.currentPeriodEnd - a.currentPeriodEnd,
		);
		if (!subscription) return null;

		const product = await ctx.db
			.query("products")
			.withIndex("by_stripe_price_id", (q) =>
				q.eq("stripePriceId", subscription.priceId),
			)
			.unique();

		const user = await ctx.db
			.query("users")
			.withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
			.unique();

		// Suppress a pending plan change once the subscription already moved to it.
		const pending = user?.pendingPlanChange ?? null;
		const pendingPlanChange =
			pending && product && pending.interval !== product.interval
				? pending
				: null;

		// Which billing system owns this subscription. Today every live sub is
		// Stripe (web). When Apple/Google IAP lands, those entitlements report
		// "apple"/"google" so the UI can branch manage/cancel flows. Typed as the
		// full union now so consumers can write those branches ahead of time.
		const provider: "stripe" | "apple" | "google" = "stripe";

		return {
			stripeSubscriptionId: subscription.stripeSubscriptionId,
			provider,
			status: subscription.status,
			interval: product?.interval ?? null,
			priceId: subscription.priceId,
			/** Stripe epoch seconds. */
			currentPeriodEnd: subscription.currentPeriodEnd,
			cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
			cancelAt: subscription.cancelAt ?? null,
			plan: product
				? {
						name: product.name,
						amountCents: product.amountCents,
						currency: product.currency,
						trialDays: product.trialDays,
						features: product.features,
					}
				: null,
			pendingPlanChange,
		};
	},
});

/** True when the user has completed payment and can use plan features. */
export const hasPaidFeatureAccess = query({
	args: {},
	returns: v.boolean(),
	handler: async (ctx) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) return false;
		return userHasPaidFeatureAccess(ctx, identity.subject);
	},
});

/** Publishable key for Stripe Elements (safe to expose to signed-in clients). */
export const getStripePublishableKey = query({
	args: {},
	returns: v.union(v.string(), v.null()),
	handler: async () => {
		return process.env.STRIPE_PUBLISHABLE_KEY ?? null;
	},
});

/** The current user's invoices, newest first (amounts are in the smallest currency unit). */
export const listMyInvoices = query({
	args: {},
	handler: async (ctx) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) return [];

		const customer = await ctx.runQuery(
			components.stripe.public.getCustomerByUserId,
			{ userId: identity.subject },
		);
		if (!customer) return [];

		const invoices = await ctx.runQuery(components.stripe.public.listInvoices, {
			stripeCustomerId: customer.stripeCustomerId,
		});

		return [...invoices]
			.sort((a, b) => b.created - a.created)
			.map((invoice) => ({
				stripeInvoiceId: invoice.stripeInvoiceId,
				created: invoice.created,
				amountDue: invoice.amountDue,
				amountPaid: invoice.amountPaid,
				status: invoice.status,
				stripeSubscriptionId: invoice.stripeSubscriptionId ?? null,
			}));
	},
});
