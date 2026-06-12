import { useAuth } from "@clerk/expo";
import { Ionicons } from "@expo/vector-icons";
import { Tabs, useRouter } from "expo-router";
import { useThemeColor } from "heroui-native/hooks";
import { useEffect, useMemo, useRef } from "react";

export default function TabLayout() {
	const { isLoaded, isSignedIn } = useAuth();
	const router = useRouter();
	const didRedirect = useRef(false);
	const [activeTint, inactiveTint, tabBackground, tabBorder] = useThemeColor([
		"accent",
		"foreground",
		"background",
		"border",
	]);

	useEffect(() => {
		if (!isLoaded || isSignedIn) {
			didRedirect.current = false;
			return;
		}
		if (didRedirect.current) return;
		didRedirect.current = true;
		router.replace("/(auth)");
	}, [isLoaded, isSignedIn, router]);

	const screenOptions = useMemo(
		() => ({
			headerShown: false as const,
			tabBarActiveTintColor: activeTint,
			tabBarInactiveTintColor: inactiveTint,
			tabBarStyle: {
				backgroundColor: tabBackground,
				borderTopColor: tabBorder,
			},
			tabBarLabelStyle: {
				fontSize: 12,
				fontWeight: "500" as const,
			},
		}),
		[activeTint, inactiveTint, tabBackground, tabBorder],
	);

	if (!isLoaded || !isSignedIn) {
		return null;
	}

	return (
		<Tabs screenOptions={screenOptions}>
			<Tabs.Screen
				name="index"
				options={{
					title: "Desk",
					tabBarIcon: ({ color, size }) => (
						<Ionicons name="desktop-outline" size={size} color={color} />
					),
				}}
			/>
			<Tabs.Screen
				name="library"
				options={{
					title: "Library",
					tabBarIcon: ({ color, size }) => (
						<Ionicons name="library-outline" size={size} color={color} />
					),
				}}
			/>
			<Tabs.Screen
				name="account"
				options={{
					title: "Account",
					tabBarIcon: ({ color, size }) => (
						<Ionicons name="person-circle-outline" size={size} color={color} />
					),
				}}
			/>
		</Tabs>
	);
}
