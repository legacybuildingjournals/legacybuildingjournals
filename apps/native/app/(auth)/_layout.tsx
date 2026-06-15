import { useAuth } from "@clerk/expo";
import { Redirect, Stack } from "expo-router";
/** Auth screens: when signed in, go straight to the tabs. Redirecting to "/"
 * instead loops infinitely, because "/" also resolves to (auth)/index (route
 * group), which re-mounts this layout and redirects to "/" again. */
export default function AuthRoutesLayout() {
	const { isLoaded, isSignedIn } = useAuth();

	if (!isLoaded) {
		return null;
	}

	if (isSignedIn) {
		return <Redirect href={"/(tabs)"} />;
	}

	return (
		<Stack
			screenOptions={{
				headerShown: false,
				animation: "slide_from_right",
				contentStyle: { backgroundColor: "transparent" },
			}}
		>
			{/* Android can still show the route segment name unless each screen opts out. */}
			<Stack.Screen name="index" options={{ headerShown: false, title: "" }} />
			<Stack.Screen name="sign-in" options={{ headerShown: false }} />
			<Stack.Screen name="sign-up" options={{ headerShown: false }} />
			<Stack.Screen name="forgot-password" options={{ headerShown: false }} />
			<Stack.Screen name="verify-email" options={{ headerShown: false }} />
		</Stack>
	);
}
