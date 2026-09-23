/**
 * App store listings and the visitor-platform sniff, shared by every surface
 * that offers the app for download.
 *
 * Single source of truth on purpose: these URLs previously existed in two
 * places — the web invite page and the native community module — and drifted,
 * so one kept pointing at the Android testing opt-in after the app went public.
 */

export const APP_STORE_URL = "https://apps.apple.com/app/id6778774585";

/**
 * Android is on production release, so the plain listing resolves for everyone.
 * While it was in closed testing this was `false`, which sent newcomers to the
 * opt-in page instead — the normal listing 404s for anyone who isn't a tester.
 */
export const ANDROID_IS_PUBLIC = true;

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

/** The store button a given visitor should see. */
export function storeTargetFor(platform: VisitorPlatform): {
	url: string;
	label: string;
} {
	if (platform === "android") {
		return {
			url: PLAY_STORE_URL,
			label: ANDROID_IS_PUBLIC
				? "Get it on Google Play"
				: "Join the Android test",
		};
	}
	return { url: APP_STORE_URL, label: "Download on the App Store" };
}
