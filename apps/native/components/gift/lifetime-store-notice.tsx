import { api } from "@legacy-building/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { useEffect } from "react";
import { Alert, Linking } from "react-native";

const STORE = {
	app_store: {
		name: "App Store",
		url: "itms-apps://apps.apple.com/account/subscriptions",
	},
	play_store: {
		name: "Google Play",
		url: "https://play.google.com/store/account/subscriptions",
	},
} as const;

/** Shown at most once per app session. */
let shownThisSession = false;

/**
 * Lifetime access (redeemed gift) makes a store subscription redundant, but
 * Apple and Google only let the user cancel it themselves. Explain how, once
 * per app session, until it's cancelled (decision 8).
 */
export function LifetimeStoreNotice() {
	const status = useQuery(api.gifts.queries.myLifetimeStatus);

	useEffect(() => {
		const store = status?.storeSubscriptionToCancel;
		if (!store || shownThisSession) return;
		shownThisSession = true;
		const target = STORE[store];
		Alert.alert(
			"You now have lifetime access",
			`You still have a subscription through ${target.name} that will keep renewing. We can't cancel it for you: open your ${target.name} subscriptions and cancel Legacy Building to stop being charged.`,
			[
				{ text: "Later", style: "cancel" },
				{
					text: "Manage subscription",
					onPress: () => void Linking.openURL(target.url),
				},
			],
		);
	}, [status?.storeSubscriptionToCancel]);

	return null;
}
