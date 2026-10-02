import authPanelBackground from "../images/auth-panel-background.jpg";
import communityMemories from "../images/community-memories.jpeg";
import communityQrExport from "../images/community-qr-export.jpeg";
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
import arrowRightIcon from "../images/onboarding/arrow-right.svg";
import badgeFormIcon from "../images/onboarding/badge-form.png";
import badgeFutureIcon from "../images/onboarding/badge-future.png";
import badgeInsightIcon from "../images/onboarding/badge-insight.png";
import childIllustration from "../images/onboarding/illustration-child.webp";
import grandchildIllustration from "../images/onboarding/illustration-grandchild.webp";
import myselfIllustration from "../images/onboarding/illustration-myself.webp";
import otherIllustration from "../images/onboarding/illustration-other.webp";
import partnerIllustration from "../images/onboarding/illustration-partner.webp";
import introIllustration from "../images/onboarding/intro-illustration.webp";
import journalReadyIllustration from "../images/onboarding/journal-ready.webp";
import lockIcon from "../images/onboarding/lock.svg";
import onboardingLogoWhite from "../images/onboarding/logo-white.png";
import pillVideoIcon from "../images/onboarding/pill-video.svg";
import pillVoiceIcon from "../images/onboarding/pill-voice.svg";
import pillWriteIcon from "../images/onboarding/pill-write.svg";
import shieldIcon from "../images/onboarding/shield.svg";
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
	communityQrExport,
	communityMemories,
} as const;

/**
 * Artwork for the onboarding questionnaire, exported from the Figma file
 * ("Legacy Building v2.0"). Illustrations are transparent cut-outs sized for
 * ~2x display; the icons are the exact SVGs from the design.
 */
export const onboardingAssets = {
	logoWhite: onboardingLogoWhite,
	/** Completion-screen illustration, one per recipient. */
	illustrations: {
		child: childIllustration,
		grandchild: grandchildIllustration,
		partner: partnerIllustration,
		other: otherIllustration,
		myself: myselfIllustration,
	},
	/** "Your story starts here" art on the intro screen. */
	introIllustration,
	/** "Your journal is ready" art beside the email step. */
	journalReadyIllustration,
	/** Raster icons for the three intro badges. */
	badges: {
		time: badgeFutureIcon,
		personalized: badgeInsightIcon,
		instant: badgeFormIcon,
	},
	/** Filled Write / Voice / Video glyphs shown in the pills. */
	pills: {
		write: pillWriteIcon,
		voice: pillVoiceIcon,
		video: pillVideoIcon,
	},
	lockIcon,
	shieldIcon,
	arrowRightIcon,
} as const;
