/** Local image assets bundled with the app. */
export const nativeImages = {
	/** Vertical stacked wordmark (book icon above "LEGACY BUILDING"), matches the splash screen. */
	verticalLogo: require("../assets/images/logo-stacked.png"),
	/** Warm textured backdrop for the journal library screen. */
	libraryBackground: require("../assets/images/LibraryBackground.png"),
} as const;

/** Remote image URLs for native screens (not design tokens — use global.css for colors). */
export const nativeAssets = {
	whiteLogo:
		"https://80f7ebbdfe50de63f29ee1570f54307b.cdn.bubble.io/cdn-cgi/image/w=256,h=64,f=auto,dpr=1,fit=contain/f1777634217219x976320664399768200/whiteLogoLB.png",
	authPanelBackground:
		"https://80f7ebbdfe50de63f29ee1570f54307b.cdn.bubble.io/cdn-cgi/image/w=768,h=914,f=auto,dpr=2,fit=cover/f1773403070196x543437914641407000/IMG_3497.png",
	deskHeroBackground:
		"https://80f7ebbdfe50de63f29ee1570f54307b.cdn.bubble.io/cdn-cgi/image/w=,h=,f=auto,dpr=1,fit=contain/f1774947605183x695916817017497500/web%20app%20image.jpg.jpeg",
	defaultAvatar:
		"https://80f7ebbdfe50de63f29ee1570f54307b.cdn.bubble.io/cdn-cgi/image/w=256,h=256,f=auto,dpr=1,fit=contain/f1774343501215x970779483795198500/3608-unknown.png",
} as const;
