import { env } from "@legacy-building/env/web";

/** Redirect-only entry; use login or dashboard for user-facing navigation. */
export const ROUTES = {
	home: "/",
	dashboard: "/dashboard",
	dashboardDesk: "/dashboard/desk",
	dashboardLibrary: "/dashboard/library",
	dashboardCommunity: "/dashboard/community",
	dashboardAccount: "/dashboard/account",
	dashboardBilling: "/dashboard/billing",
	dashboardBillingCheckout: "/dashboard/billing/checkout",
	dashboardBillingCompare: "/dashboard/billing/compare",
	dashboardBillingSuccess: "/dashboard/billing/success",
	welcome: "/welcome",
	/** Invite landing; append the code: `${ROUTES.invite}/ABCD1234`. */
	invite: "/invite",
	login: "/login",
	signup: "/signup",
	ssoCallback: "/sso-callback",
	verifyEmail: "/verify-email",
	loginContinue: "/login/continue",
	terms: "/terms",
	privacy: "/privacy",
	/** Public pre-app onboarding form; also the sole route on the onboarding host. */
	preappOnboarding: "/preapponboarding",
} as const;

export type AppPath = (typeof ROUTES)[keyof typeof ROUTES];

const AUTH_PATHS: readonly string[] = [
	ROUTES.login,
	ROUTES.signup,
	ROUTES.verifyEmail,
	ROUTES.ssoCallback,
	ROUTES.loginContinue,
];

export function isAuthPath(pathname: string): boolean {
	if (AUTH_PATHS.includes(pathname)) return true;
	return pathname.startsWith("/login/");
}

/**
 * True when the app is being served from the dedicated onboarding hostname.
 *
 * The web app is a client-only SPA, so a host-based rewrite at the CDN can't
 * change what renders — the router reads `window.location.pathname`, which a
 * rewrite leaves untouched. Branching here instead makes the onboarding host
 * serve the form and nothing else, whatever path is requested.
 */
export function isOnboardingHost(): boolean {
	const host = env.VITE_ONBOARDING_HOST?.trim();
	if (!host) return false;
	if (typeof window === "undefined") return false;
	return window.location.hostname.toLowerCase() === host.toLowerCase();
}

/** Where the app lives when the form is served from its own hostname. */
const DEFAULT_APP_ORIGIN = "https://app.legacybuildingjournals.com";

/**
 * Absolute origin to send someone to when leaving the onboarding host, and an
 * empty string anywhere else — on the app's own hostname a relative link is
 * correct.
 *
 * `VITE_APP_ORIGIN` used to fall back to `""`, which looked harmless and was
 * not: because the onboarding host renders the form for *every* path, a
 * relative "continue" link simply reopened the form. Falling back to the real
 * origin means a missing env var can no longer strand anyone in that loop.
 */
export function appOriginForOnboardingHost(): string {
	if (!isOnboardingHost()) return "";
	return env.VITE_APP_ORIGIN?.trim() || DEFAULT_APP_ORIGIN;
}
