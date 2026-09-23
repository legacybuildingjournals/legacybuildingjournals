/**
 * Carries the onboarding claim token from the external form through sign-up.
 *
 * The form can be served from its own hostname, so the token arrives as a URL
 * parameter (localStorage is per-origin and wouldn't survive the hop). Once the
 * app has it, it moves into sessionStorage so it outlives the Clerk redirects
 * without lingering after the tab closes.
 */

export const ONBOARDING_TOKEN_PARAM = "onboarding";

const STORAGE_KEY = "legacy-building:onboarding-token";

/** Storage throws in private mode and when site data is blocked. */
function safeSession(): Storage | null {
	try {
		return window.sessionStorage;
	} catch {
		return null;
	}
}

/**
 * Moves a token from the current URL into storage, if one is present. Safe to
 * call on every load; returns the token in play, if any.
 */
export function captureOnboardingToken(): string | null {
	if (typeof window === "undefined") return null;

	const fromUrl = new URLSearchParams(window.location.search).get(
		ONBOARDING_TOKEN_PARAM,
	);
	if (fromUrl) {
		try {
			safeSession()?.setItem(STORAGE_KEY, fromUrl);
		} catch {
			// Not fatal — the claim just falls back to matching on email.
		}
		return fromUrl;
	}

	return readOnboardingToken();
}

export function readOnboardingToken(): string | null {
	if (typeof window === "undefined") return null;
	try {
		return safeSession()?.getItem(STORAGE_KEY) ?? null;
	} catch {
		return null;
	}
}

export function clearOnboardingToken(): void {
	if (typeof window === "undefined") return;
	try {
		safeSession()?.removeItem(STORAGE_KEY);
	} catch {
		// Nothing to do; a stale token is harmless once already claimed.
	}
}
