import { useAuth } from "@clerk/expo";
import { Redirect, Stack } from "expo-router";
import { useThemeColor } from "heroui-native";

export default function AuthRoutesLayout() {
	const { isLoaded, isSignedIn } = useAuth();
	const foreground = useThemeColor("foreground");
	const background = useThemeColor("background");

	if (!isLoaded) {
		return null;
	}

	if (isSignedIn) {
		return <Redirect href={"/"} />;
	}

	return (
		<Stack
			screenOptions={{
				headerStyle: { backgroundColor: background },
				headerTintColor: foreground,
				headerTitleStyle: { color: foreground, fontWeight: "600" },
				contentStyle: { backgroundColor: background },
			}}
		/>
	);
}
