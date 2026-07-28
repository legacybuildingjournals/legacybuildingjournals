/** Legacy Building design tokens (from Bubble app) */
export const brand = {
	primary: "#008080",
	primaryRgb: "0, 128, 128",
	pageBackground: "#ebf6f6",
	text: "#1a1a1a",
	textMuted: "#8a8a8a",
	border: "#c7c7c7",
	borderLight: "#e6e6e6",
	navInactive: "#c7c7c7",
	footerBg: "#f2f2f2",
	white: "#ffffff",
	libraryMint: "#ebf6f6",
	librarySidebarBg: "#f7f7f7",
	sidebarDateMuted: "#a6a6a6",
	entryDetailPanelBg: "#ffffff",
	dateMuted: "#f2f2f2",
	textSecondary: "#a6a6a6",
	destructive: "#b0200c",
	alert: "#dca114",
	alertLight: "#fff4db",
	overlay: "rgba(82, 82, 82, 0.6)",
	cancelBg: "#f2f2f2",
	cancelText: "#525252",
} as const;

/**
 * Community page palette.
 *
 * A deeper teal than `brand.primary` — the page sits on near-white rather than
 * mint, where #008080 reads too bright against large areas of card white.
 */
export const community = {
	pageBackground: "#fafafa",
	heading: "#33766f",
	/** Links and badge text — one step darker so it passes contrast on tints. */
	headingDeep: "#2d6a64",
	bodyMuted: "#6b7280",
	cardBorder: "#f3f4f6",
	/** Category badge on an update card. */
	badgeBg: "#e6f0ef",
	/** Status pill ("Coming Soon", a date) on an update card. */
	metaBg: "#fff7ed",
	metaText: "#9a3412",
} as const;

export const dashboardLayout = {
	headerMinHeight: 80,
	bottomNavHeight: 64,
	contentMarginTop: 80,
	contentPaddingX: 40,
	contentPaddingY: 20,
	innerMaxWidth: 1200,
	headerPaddingLeft: 29,
	headerPaddingRight: 40,
	heroRadius: 20,
	heroMinHeight: 500,
	heroPaddingX: 40,
	heroPaddingBottom: 20,
	profileSize: 200,
	profileBorder: 5,
	headerAvatarSize: 50,
	headerAvatarMinWidth: 200,
	logoWidth: 200,
	logoHeight: 50,
} as const;

export { assets } from "./brand-assets";

/** In-app legal routes (web). Native apps should open the same paths on their web host. */
export const legalRoutes = {
	terms: "/terms",
	privacy: "/privacy",
} as const;

export const youtube = {
	welcomeVideoId: "xFus-G0NNqI",
} as const;
