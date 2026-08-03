import type { Ionicons } from "@expo/vector-icons";
import { imageAssets } from "@legacy-building/assets";
import type { ImageSourcePropType } from "react-native";

/**
 * Community tab copy and links.
 *
 * Kept as constants so the tab ships without a CMS. Editing any of this needs a
 * new build — if it starts changing often, move it to a Convex table and read it
 * with a query instead.
 */

export type CommunityUpdate = {
	id: string;
	title: string;
	/** Status pill under the title. */
	badge: string;
	/** Thumbnail — the same artwork the web community page uses. */
	image: ImageSourcePropType;
	/** Optional destination; rows without one render as read-only. */
	url?: string;
};

/**
 * `packages/assets` is typed for the web bundler, where an image import is a
 * URL string. Metro resolves the same import to a numeric asset module, which
 * is what `<Image source>` wants — so the cast reflects the native runtime
 * rather than papering over a mismatch.
 */
function nativeImage(asset: unknown): ImageSourcePropType {
	return asset as ImageSourcePropType;
}

export const COMMUNITY_UPDATES: CommunityUpdate[] = [
	{
		id: "qr-export",
		title: "Easy export with QR code",
		badge: "Coming Soon",
		image: nativeImage(imageAssets.communityQrExport),
	},
	{
		id: "relive-memories",
		title: "Record videos of your memories",
		badge: "Coming Soon",
		image: nativeImage(imageAssets.communityMemories),
	},
];

export type CommunitySocial = {
	id: string;
	name: string;
	caption: string;
	/** Label on the outbound link — each platform words it differently. */
	linkLabel: string;
	icon: keyof typeof Ionicons.glyphMap;
	/** Brand colour for the mark, and the soft wash it sits on. */
	color: string;
	tint: string;
	url: string;
};

/**
 * Tracking parameters are stripped from the shared links so these stay stable —
 * the `?igsh=`/`?_t=`/`?mibextid=` suffixes are per-share tokens, not part of the
 * destination. The YouTube channel is the one that hosts the onboarding video
 * (`brand-journal.ts` → `youtube.welcomeVideoId`).
 */
export const COMMUNITY_SOCIALS: CommunitySocial[] = [
	{
		id: "youtube",
		name: "YouTube",
		caption: "Watch videos",
		linkLabel: "Visit Channel",
		icon: "logo-youtube",
		color: "#ff0000",
		tint: "#fdecec",
		url: "https://www.youtube.com/@legacybuildingjournals",
	},
	{
		id: "instagram",
		name: "Instagram",
		caption: "Behind the scenes",
		linkLabel: "Visit Profile",
		icon: "logo-instagram",
		color: "#e1306c",
		tint: "#fdeef4",
		url: "https://www.instagram.com/legacybuildingjournals",
	},
	{
		id: "facebook",
		name: "Facebook",
		caption: "Join our page",
		linkLabel: "Visit Page",
		icon: "logo-facebook",
		color: "#1877f2",
		tint: "#e9f2fe",
		url: "https://www.facebook.com/share/18jDHnyrpM/",
	},
	{
		id: "tiktok",
		name: "Tiktok",
		caption: "Keep updated",
		linkLabel: "View Profile",
		icon: "logo-tiktok",
		color: "#0f6b62",
		tint: "#e8f4f1",
		url: "https://www.tiktok.com/@legacy_building_journals",
	},
];

export const COMMUNITY_PRIVACY_NOTE =
	"Your personal information won't be shared on the community or any platform.";

/** Message body used when sharing an invite. */
export function inviteShareMessage(link: string): string {
	return `Join me on Legacy Building — preserve your family's stories before they're lost.\n\n${link}`;
}

/** Store listings, used by the share sheet. */
export const APP_STORE_URL = "https://apps.apple.com/app/id6778774585";

/**
 * Android is in closed testing, so a new invitee must join the test before the
 * normal listing resolves for them. Swap to the plain listing once public.
 */
export const PLAY_STORE_URL =
	"https://play.google.com/apps/testing/com.legacybuildingjournals.app";
