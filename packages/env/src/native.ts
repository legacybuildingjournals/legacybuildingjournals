import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

// apps/native/.env is loaded in metro.config.js before bundling (see monorepo note in README).

export const env = createEnv({
	clientPrefix: "EXPO_PUBLIC_",
	client: {
		EXPO_PUBLIC_CONVEX_URL: z.url(),
		EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
		EXPO_PUBLIC_REVENUECAT_APPLE_KEY: z.string().min(1).optional(),
		EXPO_PUBLIC_REVENUECAT_GOOGLE_KEY: z.string().min(1).optional(),
	},
	runtimeEnv: {
		EXPO_PUBLIC_CONVEX_URL: process.env.EXPO_PUBLIC_CONVEX_URL,
		EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY:
			process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY,
		EXPO_PUBLIC_REVENUECAT_APPLE_KEY:
			process.env.EXPO_PUBLIC_REVENUECAT_APPLE_KEY,
		EXPO_PUBLIC_REVENUECAT_GOOGLE_KEY:
			process.env.EXPO_PUBLIC_REVENUECAT_GOOGLE_KEY,
	},
	emptyStringAsUndefined: true,
});
