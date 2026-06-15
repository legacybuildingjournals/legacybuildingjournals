import { useAuth } from "@clerk/expo";
import { Redirect, Stack } from "expo-router";
/** Auth screens only — no redirects here (avoids ping-pong with the tabs layout). */
export default function AuthRoutesLayout() {
	const { isLoaded, isSignedIn } = useAuth();

	if (!isLoaded) {
		return null;
	}

	if (isSignedIn) {
		return <Redirect href={"/"} />;
	}

	return (
		<Stack
			screenOptions={{
				headerShown: false,
				animation: "slide_from_right",
				contentStyle: { backgroundColor: "transparent" },
			}}
		/>
	);
}
