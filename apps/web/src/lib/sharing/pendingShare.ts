/**
 * Remembers which share invite a visitor was claiming while they leave
 * `/share/<token>` to sign in or create an account, so the app can bring them
 * back to accept it.
 */
const KEY = "lb.pendingShareToken";

export function storePendingShareToken(token: string) {
	try {
		window.localStorage.setItem(KEY, token);
	} catch {
		// Storage unavailable; the user can reopen the link.
	}
}

export function readPendingShareToken(): string | null {
	try {
		return window.localStorage.getItem(KEY);
	} catch {
		return null;
	}
}

export function clearPendingShareToken() {
	try {
		window.localStorage.removeItem(KEY);
	} catch {
		// ignore
	}
}
