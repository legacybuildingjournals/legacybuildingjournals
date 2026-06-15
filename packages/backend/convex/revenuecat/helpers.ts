/**
 * Pure mappers from RevenueCat webhook payloads to our schema enums.
 * No DB access here — used by the HTTP webhook handler.
 */

export type SubscriptionProvider = "apple" | "google" | "stripe";
export type IapSubscriptionStatus =
	| "active"
	| "trialing"
	| "grace_period"
	| "canceled"
	| "expired";
export type PlanInterval = "monthly" | "annual";

/** RevenueCat `store` → our provider. Returns null for stores we don't track. */
export function storeToProvider(store: unknown): SubscriptionProvider | null {
	switch (store) {
		case "APP_STORE":
		case "MAC_APP_STORE":
			return "apple";
		case "PLAY_STORE":
			return "google";
		case "STRIPE":
		case "RC_BILLING":
			return "stripe";
		default:
			return null;
	}
}

/** Product identifier convention → billing interval. */
export function productToInterval(
	productId: unknown,
): PlanInterval | undefined {
	if (typeof productId !== "string") return undefined;
	const id = productId.toLowerCase();
	if (id.includes("annual") || id.includes("yearly") || id.includes("year")) {
		return "annual";
	}
	if (id.includes("month")) return "monthly";
	return undefined;
}

const TRIAL_PERIODS = new Set(["TRIAL", "INTRO"]);

/**
 * Map a RevenueCat event type (+ period type) to our subscription status.
 * Returns null for events that should not change subscription state
 * (e.g. TRANSFER, SUBSCRIBER_ALIAS, TEST).
 */
export function eventToStatus(
	eventType: unknown,
	periodType: unknown,
): IapSubscriptionStatus | null {
	const isTrial = TRIAL_PERIODS.has(String(periodType));

	switch (eventType) {
		case "INITIAL_PURCHASE":
		case "RENEWAL":
		case "PRODUCT_CHANGE":
		case "UNCANCELLATION":
			return isTrial ? "trialing" : "active";
		// User turned off auto-renew — still has access until expiration.
		case "CANCELLATION":
			return "canceled";
		// Payment failed — Apple/Google retry during grace period.
		case "BILLING_ISSUE":
			return "grace_period";
		case "EXPIRATION":
		case "SUBSCRIPTION_PAUSED":
			return "expired";
		default:
			return null;
	}
}

export function isTrialPeriod(periodType: unknown): boolean {
	return TRIAL_PERIODS.has(String(periodType));
}

export function normalizeEnvironment(
	environment: unknown,
): "sandbox" | "production" | undefined {
	if (environment === "SANDBOX") return "sandbox";
	if (environment === "PRODUCTION") return "production";
	return undefined;
}
