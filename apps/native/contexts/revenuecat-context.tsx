import {
	createContext,
	type ReactNode,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";
import type { CustomerInfo } from "react-native-purchases";

import {
	checkProAccess,
	hasPro,
	initRevenueCat,
	onCustomerInfoUpdated,
} from "@/lib/billing/revenuecat";

type RevenueCatContextValue = {
	/** Whether the SDK has finished its initial customer-info fetch. */
	isReady: boolean;
	/** Whether the current user has the pro entitlement. */
	isPro: boolean;
	/** The raw CustomerInfo — null until the first fetch resolves. */
	customerInfo: CustomerInfo | null;
};

const RevenueCatContext = createContext<RevenueCatContextValue>({
	isReady: false,
	isPro: false,
	customerInfo: null,
});

export function RevenueCatProvider({ children }: { children: ReactNode }) {
	const [isReady, setIsReady] = useState(false);
	const [isPro, setIsPro] = useState(false);
	const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);

	useEffect(() => {
		// 1. Configure the SDK (no-op if already configured).
		initRevenueCat();

		// 2. Fetch initial status.
		checkProAccess()
			.then((pro) => {
				setIsPro(pro);
				setIsReady(true);
			})
			.catch(() => {
				// SDK may not be configured (no API key) — treat as free.
				setIsReady(true);
			});

		// 3. Listen for live updates (renewal, cancellation, etc.).
		const unsubscribe = onCustomerInfoUpdated((info) => {
			setCustomerInfo(info);
			setIsPro(hasPro(info));
		});

		return unsubscribe;
	}, []);

	const value = useMemo<RevenueCatContextValue>(
		() => ({ isReady, isPro, customerInfo }),
		[isReady, isPro, customerInfo],
	);

	return (
		<RevenueCatContext.Provider value={value}>
			{children}
		</RevenueCatContext.Provider>
	);
}

/**
 * Access RevenueCat subscription state from anywhere in the app.
 *
 * ```tsx
 * const { isPro, isReady } = useRevenueCat();
 * ```
 */
export function useRevenueCat(): RevenueCatContextValue {
	return useContext(RevenueCatContext);
}
