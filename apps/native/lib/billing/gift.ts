import Purchases, {
	PRODUCT_CATEGORY,
	type PurchasesStoreProduct,
} from "react-native-purchases";

import { getCustomerInfo } from "@/lib/billing/revenuecat";

/**
 * Store product id of the lifetime gift: a one-time (consumable) in-app
 * product in App Store Connect and Play Console, imported into RevenueCat.
 * Must match `convex/gifts/helpers.ts#GIFT_STORE_PRODUCT_ID`.
 */
export const GIFT_STORE_PRODUCT_ID = "lifetime_gift";

/**
 * Load the gift product with the store's localised price (e.g. "Rs 27,500").
 * Returns null when RevenueCat isn't configured (web, missing key) or the
 * product isn't set up in the store yet. Expo Go runs RevenueCat in preview
 * mode, so expect null (or a mock) there.
 */
export async function getGiftProduct(): Promise<PurchasesStoreProduct | null> {
	// getCustomerInfo returns null when the SDK isn't configured.
	if ((await getCustomerInfo().catch(() => null)) === null) return null;
	try {
		const products = await Purchases.getProducts(
			[GIFT_STORE_PRODUCT_ID],
			PRODUCT_CATEGORY.NON_SUBSCRIPTION,
		);
		return products[0] ?? null;
	} catch (error) {
		console.warn("[RevenueCat] getProducts(gift) failed", error);
		return null;
	}
}

export type GiftPurchaseResult =
	| { status: "purchased"; transactionId: string }
	| { status: "cancelled" };

/** Open the store purchase sheet for the gift product. */
export async function purchaseGift(
	product: PurchasesStoreProduct,
): Promise<GiftPurchaseResult> {
	try {
		const { transaction } = await Purchases.purchaseStoreProduct(product);
		return {
			status: "purchased",
			transactionId: transaction.transactionIdentifier,
		};
	} catch (error) {
		if (
			typeof error === "object" &&
			error !== null &&
			"userCancelled" in error &&
			(error as { userCancelled?: boolean }).userCancelled
		) {
			return { status: "cancelled" };
		}
		throw error;
	}
}
