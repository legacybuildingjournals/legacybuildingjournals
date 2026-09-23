import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
	clientPrefix: "VITE_",
	client: {
		VITE_CONVEX_URL: z.url(),
		VITE_CLERK_PUBLISHABLE_KEY: z.string().min(1),
		/**
		 * Hostname that serves only the pre-app onboarding form (e.g.
		 * "start.legacybuilding.com"). Optional: unset everywhere except that
		 * domain's deployment, where it makes the app render the form alone.
		 */
		VITE_ONBOARDING_HOST: z.string().optional(),
		/**
		 * Absolute origin of the main app (e.g. "https://app.legacybuilding.com").
		 * Required only on the onboarding host, where a relative link would be
		 * caught by that host's form-only branch instead of reaching sign-up.
		 */
		VITE_APP_ORIGIN: z.url().optional(),
	},
	runtimeEnv: (
		import.meta as unknown as { env: Record<string, string | undefined> }
	).env,
	emptyStringAsUndefined: true,
});
