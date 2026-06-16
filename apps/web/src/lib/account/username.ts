/** Prefer stored username; fall back to Clerk display name as entered. */
export function defaultUsername(
	convexName: string | undefined,
	clerkFullName: string | null | undefined,
): string {
	if (convexName?.trim()) return convexName.trim();
	if (clerkFullName?.trim()) return formatNameAsUsername(clerkFullName);
	return "";
}

/** Trim and normalize spacing; does not insert hyphens. */
export function formatNameAsUsername(fullName: string): string {
	return fullName.trim().replace(/\s+/g, " ");
}

export function isGoogleOAuthProvider(provider: string | undefined): boolean {
	if (!provider) return false;
	const p = provider.toLowerCase();
	return p === "google" || p === "oauth_google" || p.includes("google");
}
