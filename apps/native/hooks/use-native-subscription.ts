import { api } from "@legacy-building/backend/convex/_generated/api";
import { useQuery } from "convex/react";

import { useRevenueCat } from "@/contexts/revenuecat-context";
import type { BillingProvider, PlanStatus } from "@/lib/billing/plans";
import { ENTITLEMENT_ID } from "@/lib/billing/revenuecat";

/**
 * Resolves the user's subscription from two sources, in order:
 *
 * 1. **RevenueCat on-device** — freshest for a purchase just made in the app
 *    (Apple/Google). Reports the store, so we know the exact provider.
 * 2. **Convex `getEntitlement`** — the server source of truth, which merges
 *    webhook-synced IAP subscriptions (Apple/Google) with Stripe (web) and
 *    admin/beta access. Covers cross-platform cases: a Stripe web subscriber
 *    opening the app, or an IAP subscriber before the on-device cache warms up.
 *
 * The `provider` it returns drives where the user manages/cancels their plan
 * (App Store / Play Store / web).
 */
export function useNativeSubscription() {
	const entitlement = useQuery(api.subscriptions.queries.getEntitlement);
	const { isPro, isReady: rcReady, customerInfo } = useRevenueCat();

	const isLoading = entitlement === undefined || !rcReady;

	// 1. RevenueCat on-device — authoritative for a fresh native purchase.
	if (isPro && customerInfo) {
		const entry = customerInfo.entitlements.active[ENTITLEMENT_ID];
		const store = entry?.store;
		const provider: BillingProvider =
			store === "APP_STORE" || store === "MAC_APP_STORE"
				? "apple"
				: store === "PLAY_STORE"
					? "google"
					: "stripe";
		const productId = entry?.productIdentifier ?? "";
		const plan: PlanStatus =
			productId.includes("annual") || productId.includes("yearly")
				? "annual"
				: "monthly";

		return {
			plan,
			hasPaidAccess: true,
			isLoading,
			provider,
			isTrialing: entry?.periodType === "TRIAL",
			cancelAtPeriodEnd: entry?.willRenew === false,
			currentPeriodEnd: entry?.expirationDateMillis
				? Math.floor(entry.expirationDateMillis / 1000)
				: null,
		};
	}

	// 2. Server entitlement (webhook-synced IAP + Stripe + admin/beta).
	if (entitlement?.hasAccess) {
		return {
			plan: (entitlement.interval ?? "monthly") as PlanStatus,
			hasPaidAccess: true,
			isLoading,
			provider: (entitlement.provider ?? "stripe") as BillingProvider,
			isTrialing: entitlement.isTrial,
			cancelAtPeriodEnd: entitlement.willRenew === false,
			// Normalize ms → seconds to match the on-device branch.
			currentPeriodEnd: entitlement.currentPeriodEnd
				? Math.floor(entitlement.currentPeriodEnd / 1000)
				: null,
		};
	}

	// 3. Free / no subscription.
	return {
		plan: "free" as PlanStatus,
		hasPaidAccess: false,
		isLoading,
		provider: "stripe" as BillingProvider,
		isTrialing: false,
		cancelAtPeriodEnd: false,
		currentPeriodEnd: null,
	};
}
