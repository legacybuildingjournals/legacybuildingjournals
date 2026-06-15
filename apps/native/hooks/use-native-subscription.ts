import { api } from "@legacy-building/backend/convex/_generated/api";
import { useQuery } from "convex/react";

import { useRevenueCat } from "@/contexts/revenuecat-context";
import type { BillingProvider, PlanStatus } from "@/lib/billing/plans";
import { ENTITLEMENT_ID } from "@/lib/billing/revenuecat";

type SubscriptionDoc = {
	provider: BillingProvider;
	status: string;
	interval: "monthly" | "annual" | null;
	currentPeriodEnd: number;
	cancelAtPeriodEnd: boolean;
};

/**
 * Resolves the user's subscription status from two sources:
 *
 * 1. **Convex (Stripe)** — for users who subscribed via the web app.
 * 2. **RevenueCat** — for users who subscribed via native IAP (Apple/Google).
 *
 * RevenueCat takes precedence when active, since Apple/Google require their
 * billing system for mobile subscriptions.
 */
export function useNativeSubscription() {
	// Convex/Stripe source (existing web subscribers).
	const subscription = useQuery(api.stripe.queries.getMySubscription) as
		| SubscriptionDoc
		| null
		| undefined;
	const hasPaidAccess = useQuery(api.stripe.queries.hasPaidFeatureAccess);

	// RevenueCat source (native IAP subscribers).
	const { isPro, isReady: rcReady, customerInfo } = useRevenueCat();

	const isLoading =
		subscription === undefined || hasPaidAccess === undefined || !rcReady;

	// Determine provider and plan from the active source.
	// RevenueCat pro access takes precedence over Stripe.
	let plan: PlanStatus = "free";
	let provider: BillingProvider = "stripe";

	if (isPro && customerInfo) {
		// User has an active IAP subscription through RevenueCat.
		const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];
		const store = entitlement?.store;

		provider =
			store === "APP_STORE" || store === "MAC_APP_STORE"
				? "apple"
				: store === "PLAY_STORE"
					? "google"
					: "stripe";

		// Determine interval from the product identifier convention.
		const productId = entitlement?.productIdentifier ?? "";
		if (productId.includes("annual") || productId.includes("yearly")) {
			plan = "annual";
		} else {
			plan = "monthly";
		}
	} else if (subscription?.interval) {
		// Fall back to Stripe/Convex subscription.
		plan = subscription.interval;
		provider = subscription.provider ?? "stripe";
	}

	const isActive = plan !== "free";

	// For IAP subscriptions, cancellation/renewal info comes from RevenueCat.
	// For Stripe, it comes from the Convex subscription doc.
	const cancelAtPeriodEnd = isPro
		? customerInfo?.entitlements.active[ENTITLEMENT_ID]?.willRenew === false
		: (subscription?.cancelAtPeriodEnd ?? false);

	const currentPeriodEnd = isPro
		? customerInfo?.entitlements.active[ENTITLEMENT_ID]?.expirationDateMillis
			? Math.floor(
					(customerInfo.entitlements.active[ENTITLEMENT_ID]
						?.expirationDateMillis ?? 0) / 1000,
				)
			: null
		: (subscription?.currentPeriodEnd ?? null);

	return {
		plan,
		hasPaidAccess: isPro || (hasPaidAccess ?? false),
		isLoading,
		subscription: subscription ?? null,
		provider,
		isTrialing: isPro
			? customerInfo?.entitlements.active[ENTITLEMENT_ID]?.periodType ===
				"TRIAL"
			: subscription?.status === "trialing",
		cancelAtPeriodEnd,
		currentPeriodEnd,
	};
}
