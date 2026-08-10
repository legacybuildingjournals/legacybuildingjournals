import { assets } from "@legacy-building/ui/lib/brand-journal";
import type { LucideIcon } from "lucide-react";
import { Clock } from "lucide-react";

import {
	FacebookIcon,
	InstagramIcon,
	TikTokIcon,
	YouTubeIcon,
} from "@/components/community/SocialIcons";

/**
 * Community page copy and links.
 *
 * Mirrors `apps/native/lib/community/content.ts` — same destinations, longer
 * copy because the web cards have room for it. Kept as constants so the page
 * ships without a CMS; move it to a Convex table if it starts changing often.
 */

export type CommunityUpdate = {
	id: string;
	/** Category pill above the title. */
	badge: string;
	title: string;
	description: string;
	/** Status pill under the description — a ship estimate or a publish date. */
	meta: string;
	metaIcon: LucideIcon;
	/**
	 * Card artwork. Absent until the images land, in which case the card falls
	 * back to a teal wash with the meta icon on it.
	 */
	imageUrl?: string;
	url?: string;
};

export type CommunitySocial = {
	id: string;
	name: string;
	caption: string;
	/** Label on the outbound link — each platform words it differently. */
	linkLabel: string;
	icon: (props: { className?: string }) => React.JSX.Element;
	/** Brand colour for the mark, and the soft wash it sits on. */
	color: string;
	tint: string;
	url: string;
};

export const COMMUNITY_UPDATES: CommunityUpdate[] = [
	{
		id: "qr-export",
		badge: "Feature update",
		title: "Easy export with QR code",
		description:
			"Access your exported recording entries with personalized QR codes",
		meta: "Shipped",
		metaIcon: Clock,
		imageUrl: assets.communityQrExport,
	},
	{
		id: "relive-memories",
		badge: "Feature update",
		title: "Record videos of your memories",
		description:
			"Record videos and save them into your journal to relive them forever",
		meta: "Shipped",
		metaIcon: Clock,
		imageUrl: assets.communityMemories,
	},
];

/**
 * Tracking parameters are stripped from the shared links so these stay stable —
 * the `?igsh=`/`?_t=`/`?mibextid=` suffixes are per-share tokens, not part of
 * the destination.
 */
export const COMMUNITY_SOCIALS: CommunitySocial[] = [
	{
		id: "youtube",
		name: "YouTube",
		caption: "Video guides and tips",
		linkLabel: "Visit Channel",
		icon: YouTubeIcon,
		color: "#dc2626",
		tint: "#fef2f2",
		url: "https://www.youtube.com/@legacybuildingjournals",
	},
	{
		id: "facebook",
		name: "Facebook",
		caption: "Join our growing community",
		linkLabel: "Visit Page",
		icon: FacebookIcon,
		color: "#1877f2",
		tint: "#eff6ff",
		url: "https://www.facebook.com/people/Legacy-Building-Journals-Community/61589024611908/",
	},
	{
		id: "instagram",
		name: "Instagram",
		caption: "Stories, updates and inspirations",
		linkLabel: "Visit Profile",
		icon: InstagramIcon,
		color: "#e1306c",
		tint: "#fdf2f8",
		url: "https://www.instagram.com/legacybuildingjournals",
	},
	{
		id: "tiktok",
		name: "Tiktok",
		caption: "Monthly stories and exclusive content",
		linkLabel: "View Profile",
		icon: TikTokIcon,
		color: "#0f6b62",
		tint: "#ecfdf5",
		url: "https://www.tiktok.com/@legacy_building_journals",
	},
];

export const COMMUNITY_PRIVACY_NOTE =
	"Your personal information won't be shared on the community or any platform.";
