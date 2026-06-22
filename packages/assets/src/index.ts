import authPanelBackground from "../images/auth-panel-background.jpg";
import defaultAvatar from "../images/default-avatar.jpg";
import deskHeroBackground from "../images/desk-hero-background.jpeg";
import digLogo from "../images/dig-logo.png";
import favicon from "../images/favicon.png";
import googleLogo from "../images/google logo.jpeg";
import headerBackground from "../images/header-background.jpg";
import heroBackground from "../images/hero-background.jpg";
import heroPanelImage from "../images/hero-panel-image.png";
import libraryEmptyImage from "../images/library-empty.png";
import loaderLottie from "../images/loader.lottie";
import logo from "../images/logo.png";
import whiteLogo from "../images/white-logo.png";

/** Bundled brand images (Vite → URL string; Metro → numeric asset module). */
export const imageAssets = {
	favicon,
	logo,
	heroBackground,
	heroPanelImage,
	authPanelBackground,
	loaderLottie,
	whiteLogo,
	digLogo,
	googleLogo,
	headerBackground,
	deskHeroBackground,
	defaultAvatar,
	headerAvatar: defaultAvatar,
	libraryEmptyImage,
} as const;
