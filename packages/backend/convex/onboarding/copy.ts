/**
 * Static copy for the intro and email screens, taken from the Figma designs so
 * web and native read from one place. Question and completion copy live in
 * `questions.ts` and `results.ts`.
 */

/** Web intro (desktop + mobile web). */
export const WEB_INTRO_COPY = {
	heading: "Let’s personalize the\nLegacy Building",
	subheading: "Everyday moments matter.",
	body: "Answer a few questions so we can tailor your journal experience and help you start with the memories that matter.",
	badges: [
		{ key: "time", label: "Takes 2-3 minutes" },
		{ key: "personalized", label: "Personalized Experience" },
		{ key: "instant", label: "Instant Onboarding" },
	],
	paragraph:
		"You’ll answer a few thoughtful questions, then you can continue building your legacy later on the app or web.",
	cta: "Start the quiz",
	lockNotice:
		"Your answers stay private and can be saved to your account later.",
} as const;

/** Native intro. The title's last word is rendered in the brand colour. */
export const NATIVE_INTRO_COPY = {
	titleLead: "Your Legacy Build",
	titleAccent: "Quiz",
	subheading: "Your everyday moments matter.",
	body: "Capture them in your own voice.",
	pills: ["Write", "Voice", "Video"],
	cta: "Start Building Your Legacy",
	/** Tagline in the header above every native onboarding screen. */
	headerTagline: "Preserve your memories\nafter the moment has passed.",
} as const;

/** External (pre-account) email step. */
export const EMAIL_COPY = {
	heading: "Where should we send\nyour results?",
	subtitle:
		"We’ll email your results and save your journal setup so you can continue later.",
	label: "Email",
	placeholder: "you@example.com",
	calloutTitle: "Good to know",
	calloutBody:
		"Use the same email later on the app or website, and your journal will already be set up, no need to fill this out again.",
	submit: "See my results",
	back: "Back",
} as const;
