import { useAuth } from "@clerk/expo";
import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs, useRouter } from "expo-router";
import { useThemeColor } from "heroui-native/hooks";
import { useEffect, useMemo, useRef } from "react";

import { useNativeCurrentUser } from "@/hooks/use-native-current-user";

export default function TabLayout() {
	const { isLoaded, isSignedIn } = useAuth();
	const { convexUser, isLoading: userLoading } = useNativeCurrentUser();
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

	// Wait for the Convex user before deciding, then send first-run users through
	// onboarding (username + welcome video) until `welcomeCompletedAt` is set.
	if (userLoading) {
		return null;
	}

	if (!convexUser || !convexUser.welcomeCompletedAt) {
		return <Redirect href="/welcome" />;
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
