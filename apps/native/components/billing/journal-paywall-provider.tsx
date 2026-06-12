import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useMemo,
	useState,
} from "react";

import { PaywallModal } from "@/components/billing/paywall-modal";
import { useNativeSubscription } from "@/hooks/use-native-subscription";
import type { PlanStatus } from "@/lib/billing/plans";

type JournalPaywallContextValue = {
	plan: PlanStatus;
	hasPaidAccess: boolean;
	isLoading: boolean;
	guardJournalAction: (action: () => void) => void;
	openPaywall: () => void;
};

const JournalPaywallContext = createContext<JournalPaywallContextValue | null>(
	null,
);

export function JournalPaywallProvider({ children }: { children: ReactNode }) {
	const { plan, hasPaidAccess, isLoading } = useNativeSubscription();
	const [open, setOpen] = useState(false);

	const guardJournalAction = useCallback(
		(action: () => void) => {
			if (isLoading) return;
			if (hasPaidAccess) {
				action();
				return;
			}
			setOpen(true);
		},
		[hasPaidAccess, isLoading],
	);

	const openPaywall = useCallback(() => setOpen(true), []);

	const value = useMemo<JournalPaywallContextValue>(
		() => ({
			plan,
			hasPaidAccess,
			isLoading,
			guardJournalAction,
			openPaywall,
		}),
		[plan, hasPaidAccess, isLoading, guardJournalAction, openPaywall],
	);

	return (
		<JournalPaywallContext.Provider value={value}>
			{children}
			<PaywallModal
				visible={open}
				onClose={() => setOpen(false)}
				currentInterval={plan === "free" ? null : plan}
			/>
		</JournalPaywallContext.Provider>
	);
}

export function useJournalPaywall(): JournalPaywallContextValue {
	const ctx = useContext(JournalPaywallContext);
	if (!ctx) {
		throw new Error(
			"useJournalPaywall must be used within JournalPaywallProvider",
		);
	}
	return ctx;
}
