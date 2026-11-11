import { useUser } from "@clerk/react";
import { api } from "@legacy-building/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useMemo,
	useState,
} from "react";

import { JournalPaywallDialog } from "@/components/billing/JournalPaywallDialog";

type JournalPaywallContextValue = {
	hasPaidAccess: boolean | undefined;
	guardJournalAction: (action: () => void) => void;
	/**
	 * Like `guardJournalAction`, but a journal shared *with* you (someone
	 * else's journal) never needs your own subscription: inside it, access
	 * follows the author's (enforced on the server).
	 */
	guardJournalActionFor: (journalOwnerId: string, action: () => void) => void;
};

const JournalPaywallContext = createContext<JournalPaywallContextValue | null>(
	null,
);

export function JournalPaywallProvider({ children }: { children: ReactNode }) {
	const hasPaidAccess = useQuery(api.stripe.queries.hasPaidFeatureAccess);
	const [paywallOpen, setPaywallOpen] = useState(false);

	const guardJournalAction = useCallback(
		(action: () => void) => {
			if (hasPaidAccess === undefined) return;
			if (hasPaidAccess) {
				action();
				return;
			}
			setPaywallOpen(true);
		},
		[hasPaidAccess],
	);

	const { user } = useUser();
	const guardJournalActionFor = useCallback(
		(journalOwnerId: string, action: () => void) => {
			if (user?.id && journalOwnerId !== user.id) {
				action();
				return;
			}
			guardJournalAction(action);
		},
		[guardJournalAction, user?.id],
	);

	const value = useMemo(
		() => ({ hasPaidAccess, guardJournalAction, guardJournalActionFor }),
		[hasPaidAccess, guardJournalAction, guardJournalActionFor],
	);

	return (
		<JournalPaywallContext.Provider value={value}>
			{children}
			<JournalPaywallDialog open={paywallOpen} onOpenChange={setPaywallOpen} />
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
