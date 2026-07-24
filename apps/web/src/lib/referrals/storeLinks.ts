/**
 * Where the invite landing page sends people to get the app.
 */

export const APP_STORE_URL = "https://apps.apple.com/app/id6778774585";

/**
 * Android is in closed testing. A new invitee is not a tester yet, so the normal
 * store listing 404s for them — they have to opt in first. Flip
 * `ANDROID_IS_PUBLIC` once the app is on open/production release and the plain
 * store link starts working for everyone.
 */
export const ANDROID_IS_PUBLIC = false;

const PLAY_STORE_LISTING =
	"https://play.google.com/store/apps/details?id=com.legacybuildingjournals.app";
const PLAY_STORE_TESTING_OPT_IN =
	"https://play.google.com/apps/testing/com.legacybuildingjournals.app";

export const PLAY_STORE_URL = ANDROID_IS_PUBLIC
	? PLAY_STORE_LISTING
	: PLAY_STORE_TESTING_OPT_IN;

export type VisitorPlatform = "ios" | "android" | "desktop";

/**
 * Best-effort platform sniff, used only to choose which store button to show —
 * every path stays reachable, so a wrong guess costs nothing.
 */
export function detectVisitorPlatform(): VisitorPlatform {
	if (typeof navigator === "undefined") return "desktop";

	const ua = navigator.userAgent;
	if (/android/i.test(ua)) return "android";
	// iPadOS 13+ reports as Macintosh, so check for touch support too.
	if (/iPad|iPhone|iPod/.test(ua)) return "ios";
	if (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) return "ios";

	return "desktop";
}
