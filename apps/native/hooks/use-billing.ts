import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useEffect, useState } from "react";
import type { PurchasesPackage } from "react-native-purchases";

import type { BillingProvider, PlanInterval } from "@/lib/billing/plans";
import {
	getAnnualPackage,
	getMonthlyPackage,
	type PurchaseResult,
	purchasePackage,
	restorePurchases,
} from "@/lib/billing/revenuecat";

/** Native subscription page on each store, for managing/cancelling an IAP sub. */
const STORE_SUBSCRIPTION_URLS: Record<
	Exclude<BillingProvider, "stripe">,
	string
> = {
	apple: "itms-apps://apps.apple.com/account/subscriptions",
	google: "https://play.google.com/store/account/subscriptions",
};

/**
 * The single seam between the paywall UI and whoever actually takes the money.
 *
 * Uses RevenueCat for native in-app purchases. The paywall UI and all journal
 * gating stay untouched — only this hook changed from the Stripe web-redirect
 * approach to native StoreKit/Play Billing via RevenueCat.
 */
export function useBilling() {
	const [monthlyPkg, setMonthlyPkg] = useState<PurchasesPackage | null>(null);
	const [annualPkg, setAnnualPkg] = useState<PurchasesPackage | null>(null);
	const [isLoadingPackages, setIsLoadingPackages] = useState(true);

	// Fetch available packages on mount.
	useEffect(() => {
		let cancelled = false;

		async function load() {
			try {
				const [monthly, annual] = await Promise.all([
					getMonthlyPackage(),
					getAnnualPackage(),
				]);
				if (!cancelled) {
					setMonthlyPkg(monthly);
					setAnnualPkg(annual);
				}
			} catch {
				// Offerings may not be available yet (agreements pending).
				// The paywall will show fallback prices from Convex products.
			} finally {
				if (!cancelled) setIsLoadingPackages(false);
			}
		}

		void load();
		return () => {
			cancelled = true;
		};
	}, []);

	/** Begin a new subscription for the chosen interval via native IAP. */
	const purchase = useCallback(
		async (interval: PlanInterval): Promise<PurchaseResult> => {
			const pkg = interval === "annual" ? annualPkg : monthlyPkg;

			if (!pkg) {
				throw new Error(
					`No ${interval} package available. Offerings may not be configured yet.`,
				);
			}

			return purchasePackage(pkg);
		},
		[monthlyPkg, annualPkg],
	);

	/** Restore previous purchases — required by Apple. */
	const restore = useCallback(async (): Promise<boolean> => {
		return restorePurchases();
	}, []);

	/** Open the surface where this provider's subscription is managed/cancelled. */
	const manage = useCallback(async (provider: BillingProvider) => {
		if (provider === "apple" || provider === "google") {
			await Linking.openURL(STORE_SUBSCRIPTION_URLS[provider]);
			return;
		}
		// Stripe subs (web-originated) are managed on the web billing page.
		// This path exists for users who originally subscribed through web.
		const WEB_APP_ORIGIN =
			process.env.EXPO_PUBLIC_WEB_APP_URL?.replace(/\/$/, "") ??
			"http://localhost:3001";
		await WebBrowser.openBrowserAsync(`${WEB_APP_ORIGIN}/dashboard/billing`);
	}, []);

	return {
		purchase,
		restore,
		manage,
		monthlyPkg,
		annualPkg,
		isLoadingPackages,
	};
}
