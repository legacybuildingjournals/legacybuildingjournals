import type { Ionicons } from "@expo/vector-icons";

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
	subtitle: string;
	icon: keyof typeof Ionicons.glyphMap;
	/** Icon colour, and the soft wash behind it. */
	color: string;
	tint: string;
	/** Optional destination; rows without one render as read-only. */
	url?: string;
};

export const COMMUNITY_UPDATES: CommunityUpdate[] = [
	{
		id: "video-recording",
		title: "Video Recording Feature",
		subtitle: "Coming soon",
		icon: "newspaper-outline",
		color: "#33766f",
		tint: "#e6f0ef",
	},
	{
		id: "community-story",
		title: "Community Story",
		subtitle: "A beautiful memory shared",
		icon: "book-outline",
		color: "#e08a2c",
		tint: "#fdf0e2",
	},
];

export type CommunitySocial = {
	id: string;
	name: string;
	caption: string;
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
		icon: "logo-youtube",
		color: "#ff0000",
		tint: "#fdecec",
		url: "https://www.youtube.com/@legacybuildingjournals",
	},
	{
		id: "instagram",
		name: "Instagram",
		caption: "Behind the scenes",
		icon: "logo-instagram",
		color: "#e1306c",
		tint: "#fdeef4",
		url: "https://www.instagram.com/legacybuildingjournals",
	},
	{
		id: "facebook",
		name: "Facebook",
		caption: "Join our page",
		icon: "logo-facebook",
		color: "#1877f2",
		tint: "#e9f2fe",
		url: "https://www.facebook.com/people/Legacy-Building-Journals-Community/61589024611908/",
	},
	{
		id: "tiktok",
		name: "Tiktok",
		caption: "Keep updated",
		icon: "logo-tiktok",
		color: "#0f6b62",
		tint: "#e8f4f1",
		url: "https://www.tiktok.com/@legacy_building344",
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
