import "@expo/metro-runtime";
import "@/global.css";
import { ClerkProvider, useAuth } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { env } from "@legacy-building/env/native";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { Stack } from "expo-router";
import { HeroUINativeProvider } from "heroui-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { JournalPaywallProvider } from "@/components/billing/journal-paywall-provider";
import { ErrorBoundary } from "@/components/error-boundary";
import { NativeAppProviders } from "@/components/native-app-providers";
import { AppThemeProvider } from "@/contexts/app-theme-context";
import { RevenueCatProvider } from "@/contexts/revenuecat-context";

export const unstable_settings = {
	initialRouteName: "index",
};

const convex = new ConvexReactClient(env.EXPO_PUBLIC_CONVEX_URL, {
	unsavedChangesWarning: false,
});

function StackLayout() {
	return (
		<Stack
			screenOptions={{
				headerShown: false,
			}}
		>
			<Stack.Screen name="index" />
			<Stack.Screen name="(tabs)" />
			<Stack.Screen name="(auth)" />
			{/* First-run onboarding (username + welcome video). Gesture disabled so
			    users can't swipe back out before completing it. */}
			<Stack.Screen
				name="welcome"
				options={{ headerShown: false, gestureEnabled: false }}
			/>
			{/* Not a native modal: the paywall is itself a Modal, and iOS can't
			    present a modal on top of a modal screen (Android can). Keeping
			    this a normal pushed screen lets the paywall open on both platforms. */}
			<Stack.Screen name="journal/create" options={{ headerShown: false }} />
			<Stack.Screen
				name="journal/[journalId]/index"
				options={{ headerShown: false }}
			/>
			{/* Same reasoning as journal/create — keep non-modal so the paywall
			    (a Modal) can present over it on iOS. */}
			<Stack.Screen
				name="journal/[journalId]/new-entry"
				options={{ headerShown: false }}
			/>
			<Stack.Screen
				name="journal/entry/[entryId]"
				options={{ headerShown: false }}
			/>
			<Stack.Screen
				name="journal/entry/edit/[entryId]"
				options={{ headerShown: false }}
			/>
			<Stack.Screen
				name="account/personal-details"
				options={{ headerShown: false }}
			/>
			<Stack.Screen
				name="account/change-email"
				options={{ headerShown: false }}
			/>
			<Stack.Screen
				name="account/change-password"
				options={{ headerShown: false }}
			/>
			<Stack.Screen
				name="modal"
				options={{ title: "Modal", presentation: "modal", headerShown: true }}
			/>
		</Stack>
	);
}

export default function Layout() {
	return (
		<ErrorBoundary>
			<ClerkProvider
				tokenCache={tokenCache}
				publishableKey={env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY}
			>
				<ConvexProviderWithClerk client={convex} useAuth={useAuth}>
					<GestureHandlerRootView style={{ flex: 1 }}>
						<KeyboardProvider>
							<AppThemeProvider>
								<HeroUINativeProvider>
									<RevenueCatProvider>
										<NativeAppProviders>
											<JournalPaywallProvider>
												<StackLayout />
											</JournalPaywallProvider>
										</NativeAppProviders>
									</RevenueCatProvider>
								</HeroUINativeProvider>
							</AppThemeProvider>
						</KeyboardProvider>
					</GestureHandlerRootView>
				</ConvexProviderWithClerk>
			</ClerkProvider>
		</ErrorBoundary>
	);
}
