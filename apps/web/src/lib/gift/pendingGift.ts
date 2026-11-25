/**
 * Remembers which gift a visitor was claiming while they leave `/gift/<token>`
 * to sign in or create an account (including the Google OAuth round trip), so
 * the app can bring them straight back to finish claiming.
 */
const KEY = "lb.pendingGiftToken";

export function storePendingGiftToken(token: string) {
	try {
		window.localStorage.setItem(KEY, token);
	} catch {
		// Storage unavailable (private mode); the user can reopen the link.
	}
}

export function readPendingGiftToken(): string | null {
	try {
		return window.localStorage.getItem(KEY);
	} catch {
		return null;
	}
}

export function clearPendingGiftToken() {
	try {
		window.localStorage.removeItem(KEY);
	} catch {
		// ignore
	}
}
