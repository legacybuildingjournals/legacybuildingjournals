import { normalizeInviteCode } from "@legacy-building/backend/convex/referrals/codes";

/**
 * Holds an invite code between landing on `/invite/:code` and finishing signup.
 *
 * `localStorage` survives the Clerk OAuth round-trip (same origin), which is the
 * common path. It does not survive someone opening the link in an in-app browser
 * and then switching to Safari — the onboarding field covers that case.
 */
const STORAGE_KEY = "legacy-building.inviteCode";

export function storePendingInviteCode(code: string): void {
	const normalized = normalizeInviteCode(code);
	if (!normalized) return;
	try {
		window.localStorage.setItem(STORAGE_KEY, normalized);
	} catch {
		// Private browsing or a full quota — the onboarding field still works.
	}
}

export function readPendingInviteCode(): string | null {
	try {
		return window.localStorage.getItem(STORAGE_KEY);
	} catch {
		return null;
	}
}

export function clearPendingInviteCode(): void {
	try {
		window.localStorage.removeItem(STORAGE_KEY);
	} catch {
		// Nothing to do — a stale code is harmless, it can only be claimed once.
	}
}
