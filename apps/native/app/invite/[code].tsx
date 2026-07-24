import { useAuth } from "@clerk/expo";
import { Redirect, useLocalSearchParams } from "expo-router";

import { LoadingScreen } from "@/components/loading-screen";
import { setPendingInviteCode } from "@/lib/referrals/pending-invite";

/**
 * Receives `https://app.legacybuildingjournals.com/invite/<code>` when the app
 * is installed (universal link) and stashes the code for onboarding.
 *
 * Nothing is claimed here — attribution only happens during onboarding, so a
 * signed-in user who taps an invite simply carries on to the app.
 */
export default function InviteDeepLinkScreen() {
	const { code } = useLocalSearchParams<{ code?: string }>();
	const { isLoaded, isSignedIn } = useAuth();

	if (code) setPendingInviteCode(code);

	if (!isLoaded) return <LoadingScreen />;

	return <Redirect href={isSignedIn ? "/(tabs)" : "/(auth)"} />;
}
