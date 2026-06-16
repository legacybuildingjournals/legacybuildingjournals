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
