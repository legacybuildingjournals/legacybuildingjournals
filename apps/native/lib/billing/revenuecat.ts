import { env } from "@legacy-building/env/native";
import { Platform } from "react-native";
import Purchases, {
	type CustomerInfo,
	LOG_LEVEL,
	type PURCHASES_ERROR_CODE,
	type PurchasesPackage,
} from "react-native-purchases";

// ──────────────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────────────

/** Must match the entitlement identifier in the RevenueCat dashboard. */
export const ENTITLEMENT_ID = "legacy building journal Pro";

// ──────────────────────────────────────────────────────────
// Initialization
// ──────────────────────────────────────────────────────────

let isConfigured = false;

/**
 * Configure the RevenueCat SDK. Call once at app startup.
 * Safe to call multiple times — subsequent calls are no-ops.
 */
export function initRevenueCat(): void {
	if (isConfigured) return;

	const apiKey =
		Platform.OS === "ios"
			? env.EXPO_PUBLIC_REVENUECAT_APPLE_KEY
			: env.EXPO_PUBLIC_REVENUECAT_GOOGLE_KEY;

	if (!apiKey) {
		console.warn(
			`[RevenueCat] No API key for ${Platform.OS}. Purchases will not work.`,
		);
		return;
	}

	if (__DEV__) {
		Purchases.setLogLevel(LOG_LEVEL.VERBOSE);
	}

	Purchases.configure({ apiKey });
	isConfigured = true;
}

// Web has no RevenueCat key, so `isConfigured` stays false there and calling the
// SDK throws `UninitializedPurchasesError`. The read-only helpers below guard on
// it and answer "no subscription" instead of throwing, so the app renders free.

// ──────────────────────────────────────────────────────────
// User identity
// ──────────────────────────────────────────────────────────

/**
 * Associate the RevenueCat customer with our app user (Clerk id). This makes
 * the webhook's `app_user_id` equal the Clerk id, so the backend can map IAP
 * subscriptions to the right user. Call right after sign-in.
 */
export async function identifyUser(appUserId: string): Promise<void> {
	if (!isConfigured) return;
	try {
		await Purchases.logIn(appUserId);
	} catch (e) {
		console.warn("[RevenueCat] logIn failed", e);
	}
}

/** Reset to an anonymous customer on sign-out. */
export async function logoutUser(): Promise<void> {
	if (!isConfigured) return;
	try {
		await Purchases.logOut();
	} catch {
		// Throws if already anonymous — safe to ignore.
	}
}

// ──────────────────────────────────────────────────────────
// Entitlement helpers
// ──────────────────────────────────────────────────────────

/** Check whether the current customer has the pro entitlement. */
export function hasPro(info: CustomerInfo): boolean {
	return typeof info.entitlements.active[ENTITLEMENT_ID] !== "undefined";
}

/** Fetch the latest customer info, or null when the SDK has no key (web). */
export async function getCustomerInfo(): Promise<CustomerInfo | null> {
	if (!isConfigured) return null;
	return Purchases.getCustomerInfo();
}

/** Check pro status in one call. */
export async function checkProAccess(): Promise<boolean> {
	const info = await getCustomerInfo();
	return info !== null && hasPro(info);
}

// ──────────────────────────────────────────────────────────
// Offerings
// ──────────────────────────────────────────────────────────

/**
 * Fetch available packages from the default offering.
 * Returns an empty array if offerings aren't configured yet
 * (e.g. Paid Apps Agreement still pending).
 */
export async function getPackages(): Promise<PurchasesPackage[]> {
	if (!isConfigured) return [];
	const offerings = await Purchases.getOfferings();
	return offerings.current?.availablePackages ?? [];
}

/** Find the monthly package from the default offering. */
export async function getMonthlyPackage(): Promise<PurchasesPackage | null> {
	if (!isConfigured) return null;
	const offerings = await Purchases.getOfferings();
	return offerings.current?.monthly ?? null;
}

/** Find the annual package from the default offering. */
export async function getAnnualPackage(): Promise<PurchasesPackage | null> {
	if (!isConfigured) return null;
	const offerings = await Purchases.getOfferings();
	return offerings.current?.annual ?? null;
}

// ──────────────────────────────────────────────────────────
// Purchasing
// ──────────────────────────────────────────────────────────

export type PurchaseResult = {
	success: boolean;
	customerInfo: CustomerInfo | null;
	/** True when the user tapped cancel/back — not an error. */
	cancelled: boolean;
};

/**
 * Purchase a package and return whether the user now has pro access.
 * Handles user cancellation and already-purchased gracefully.
 */
export async function purchasePackage(
	pkg: PurchasesPackage,
): Promise<PurchaseResult> {
	try {
		const { customerInfo } = await Purchases.purchasePackage(pkg);
		return { success: hasPro(customerInfo), customerInfo, cancelled: false };
	} catch (e: unknown) {
		if (
			typeof e === "object" &&
			e !== null &&
			"userCancelled" in e &&
			(e as { userCancelled: boolean }).userCancelled
		) {
			return { success: false, customerInfo: null, cancelled: true };
		}
		// Already purchased — still a success
		if (
			typeof e === "object" &&
			e !== null &&
			"code" in e &&
			(e as { code: PURCHASES_ERROR_CODE }).code ===
				Purchases.PURCHASES_ERROR_CODE.PRODUCT_ALREADY_PURCHASED_ERROR
		) {
			const info = await getCustomerInfo();
			return {
				success: info !== null && hasPro(info),
				customerInfo: info,
				cancelled: false,
			};
		}
		throw e;
	}
}

// ──────────────────────────────────────────────────────────
// Restore
// ──────────────────────────────────────────────────────────

/**
 * Restore purchases — required by Apple for any app with subscriptions.
 * Returns whether the user has pro access after restoring.
 */
export async function restorePurchases(): Promise<boolean> {
	const info = await Purchases.restorePurchases();
	return hasPro(info);
}

// ──────────────────────────────────────────────────────────
// Listener
// ──────────────────────────────────────────────────────────

/**
 * Subscribe to customer-info changes (subscription renewal, cancellation,
 * billing issue, etc.). Returns an unsubscribe function.
 */
export function onCustomerInfoUpdated(
	listener: (info: CustomerInfo) => void,
): () => void {
	if (!isConfigured) return () => {};
	Purchases.addCustomerInfoUpdateListener(listener);
	return () => {
		Purchases.removeCustomerInfoUpdateListener(listener);
	};
}
