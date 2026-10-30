export type MemoryLinkKind = "voice" | "video";

/** Where the web app is served; the printed QR codes must point here. */
const DEFAULT_APP_ORIGIN = "https://app.legacybuildingjournals.com";

/**
 * The URL a memory QR code encodes.
 *
 * It deliberately points at our own domain rather than the raw storage URL:
 * QR codes are printed in books, so the link has to outlive the storage
 * backend, and the host people see when they scan should be ours. The page at
 * `/m/:entryId` resolves the current file at view time.
 *
 * Override the origin with the `APP_ORIGIN` Convex env var.
 */
export function memoryLinkUrl(entryId: string, kind: MemoryLinkKind): string {
	const origin = (process.env.APP_ORIGIN?.trim() || DEFAULT_APP_ORIGIN).replace(
		/\/+$/,
		"",
	);
	return `${origin}/m/${entryId}?k=${kind}`;
}
