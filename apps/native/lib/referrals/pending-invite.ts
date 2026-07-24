import { normalizeInviteCode } from "@legacy-building/backend/convex/referrals/codes";

/**
 * Holds an invite code between a universal link opening the app and onboarding
 * asking for it.
 *
 * Module state rather than storage: the handoff happens inside one app session
 * (link opens the app → sign up → onboarding), and a code that doesn't survive
 * a kill is no worse off than today — the user can still read it from the
 * landing page and type it in.
 */
let pendingInviteCode: string | null = null;

export function setPendingInviteCode(code: string): void {
	const normalized = normalizeInviteCode(code);
	pendingInviteCode = normalized || null;
}

export function readPendingInviteCode(): string | null {
	return pendingInviteCode;
}

export function clearPendingInviteCode(): void {
	pendingInviteCode = null;
}
