/**
 * Invite code format.
 *
 * Dependency-free so both clients can import it for input validation — codes
 * get read aloud and retyped, so the alphabet omits characters that are easy to
 * confuse (0/O, 1/I/L).
 */

const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
export const INVITE_CODE_LENGTH = 8;

export function generateInviteCode(): string {
	let code = "";
	for (let i = 0; i < INVITE_CODE_LENGTH; i += 1) {
		code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
	}
	return code;
}

/** Uppercases and strips spaces/dashes people add when retyping a code. */
export function normalizeInviteCode(input: string): string {
	return input.trim().toUpperCase().replace(/[\s-]/g, "");
}

export function isValidInviteCodeFormat(input: string): boolean {
	const normalized = normalizeInviteCode(input);
	if (normalized.length !== INVITE_CODE_LENGTH) return false;
	return [...normalized].every((char) => ALPHABET.includes(char));
}
