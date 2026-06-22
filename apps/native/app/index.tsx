import { useAuth } from "@clerk/expo";
import { Redirect } from "expo-router";
import { LoadingScreen } from "@/components/loading-screen";

/** Root entry — send users to Desk (signed in) or auth (signed out). */
export default function Index() {
	const { isLoaded, isSignedIn } = useAuth();

	if (!isLoaded) {
		return <LoadingScreen />;
	}

	if (isSignedIn) {
		return <Redirect href="/(tabs)" />;
	}

	return <Redirect href="/(auth)" />;
}
