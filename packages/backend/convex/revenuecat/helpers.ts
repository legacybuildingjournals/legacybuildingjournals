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

// ──────────────────────────────────────────────────────────
// REST API (`GET /v1/subscribers/{app_user_id}`) mapping
// ──────────────────────────────────────────────────────────
//
// The webhook describes a single *event*; the REST subscriber endpoint returns
// the user's *current* entitlements + subscriptions. We read it to re-sync
// authoritative state on restore/transfer (when no usable event is delivered).
// Note its `store` / `period_type` values are lower-cased vs the webhook's.

type RcEntitlement = {
	expires_date?: string | null;
	product_identifier?: string;
};

type RcSubscription = {
	expires_date?: string | null;
	store?: string;
	period_type?: string;
	unsubscribe_detected_at?: string | null;
	billing_issues_detected_at?: string | null;
};

export type RcSubscriber = {
	entitlements?: Record<string, RcEntitlement>;
	subscriptions?: Record<string, RcSubscription>;
};

export type MappedSubscription = {
	provider: SubscriptionProvider;
	status: IapSubscriptionStatus;
	interval?: PlanInterval;
	storeProductId: string;
	currentPeriodEnd?: number;
	willRenew: boolean;
	isTrial: boolean;
};

/**
 * Map a RevenueCat REST subscriber payload to our subscription shape. Picks the
 * active entitlement with the furthest expiry. Returns null when the subscriber
 * has no active entitlement — the caller should then expire any stored row.
 */
export function mapSubscriberResponse(
	subscriber: RcSubscriber,
	now: number = Date.now(),
): MappedSubscription | null {
	const entitlements = subscriber.entitlements ?? {};

	let productId: string | null = null;
	let expiresMs: number | null = null;
	let found = false;

	for (const ent of Object.values(entitlements)) {
		const ms = ent.expires_date ? Date.parse(ent.expires_date) : null;
		// `null` expiry = non-expiring (lifetime) entitlement → always active.
		const isActive = ms === null || ms > now;
		if (!isActive) continue;

		const cmp = ms ?? Number.POSITIVE_INFINITY;
		const bestCmp = expiresMs ?? Number.POSITIVE_INFINITY;
		if (!found || cmp > bestCmp) {
			found = true;
			productId = ent.product_identifier ?? null;
			expiresMs = ms;
		}
	}

	if (!found || !productId) return null;

	const sub = subscriber.subscriptions?.[productId];
	// REST stores are lower-case ("app_store"); reuse the webhook mapper upper-cased.
	const provider = storeToProvider(String(sub?.store ?? "").toUpperCase());
	if (!provider) return null;

	const isTrial = isTrialPeriod(String(sub?.period_type ?? "").toUpperCase());

	let status: IapSubscriptionStatus;
	if (sub?.billing_issues_detected_at) {
		status = "grace_period";
	} else if (sub?.unsubscribe_detected_at) {
		// Auto-renew off, but access remains until expiry.
		status = "canceled";
	} else {
		status = isTrial ? "trialing" : "active";
	}

	return {
		provider,
		status,
		interval: productToInterval(productId),
		storeProductId: productId,
		currentPeriodEnd: expiresMs ?? undefined,
		willRenew: !sub?.unsubscribe_detected_at,
		isTrial,
	};
}
