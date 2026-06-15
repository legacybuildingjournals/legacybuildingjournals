interface NativeProcessEnv {
	EXPO_PUBLIC_CONVEX_URL?: string;
	EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY?: string;
	EXPO_PUBLIC_REVENUECAT_APPLE_KEY?: string;
	EXPO_PUBLIC_REVENUECAT_GOOGLE_KEY?: string;
}

declare const process: {
	env: NativeProcessEnv;
};
