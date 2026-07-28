/**
 * Design tokens for the printed/exported journal.
 *
 * Values are sampled from the approved page mockups and expressed in PDF
 * points against an A4 page (595.28 x 841.89).
 *
 * Horizontal sizes are scaled 1:1 from the mockup (mockup width 723px maps to
 * A4's 595.28pt, a factor of 0.8234), which keeps every shape — photo, card,
 * QR plate — in exactly the proportions that were signed off. The mockup
 * canvas is taller than A4 relative to its width, so that same factor applied
 * vertically would overflow the page by ~40pt. The difference is absorbed in
 * the *gaps* rather than the shapes: whitespace tightens slightly, the design
 * itself does not distort.
 *
 * These mirror the brand palette in `packages/ui/src/lib/brand-journal.ts`,
 * duplicated here because that module pulls in bundler-resolved image assets
 * that cannot resolve inside the server-side renderer.
 */

export const pdfColors = {
	/** Full-bleed bar across the top of every content page. */
	headerBar: "#33766f",
	/** Teal used for the footer journal name. */
	accent: "#0d524c",
	/** Memory card label/icon, per memory kind — voice reads amber, video red. */
	memoryAccent: {
		voice: "#e0a824",
		video: "#dc4b3f",
	},
	/** Primary body/heading text. */
	text: "#191c1d",
	/** Entry date and page number. */
	textMuted: "#5b6664",
	/** Short rule under the entry date. */
	rule: "#e7eaea",
	/** Footer separator. */
	footerRule: "#e1e3e3",
	/** Memory card outline. */
	cardBorder: "#e3e6e6",
	/** Mint wash in the memory card's opposite corners. */
	cardTint: "#e9f7f4",
	/** Outline of the white plate the QR sits on. */
	qrPlateBorder: "#e9eaea",
	white: "#ffffff",
} as const;

const card = {
	width: 396,
	marginTop: 20,
	radius: 15,
	paddingTop: 28,
	paddingBottom: 26,
	border: 1,
} as const;

const cardLabel = {
	size: 11,
	lineHeight: 15,
	letterSpacing: 1.2,
	iconSize: 12,
	iconGap: 6,
} as const;

const qrPlate = {
	size: 200,
	radius: 8,
	padding: 12,
	marginTop: 20,
	border: 1,
} as const;

const cardCaption = { size: 12, lineHeight: 17, marginTop: 20 } as const;

/**
 * Derived rather than hardcoded: the SVG wash behind the card must match the
 * card box exactly, so the height is summed from the same values that lay the
 * contents out.
 */
const cardHeight =
	card.paddingTop +
	cardLabel.lineHeight +
	qrPlate.marginTop +
	qrPlate.size +
	cardCaption.marginTop +
	cardCaption.lineHeight +
	card.paddingBottom;

export const pdfMetrics = {
	page: { width: 595.28, height: 841.89 },
	/** Left/right page padding — matches the footer rule's span. */
	paddingX: 24,
	/** Extra inset for prose, which sits in a narrower column than the rule. */
	bodyPaddingX: 30,
	headerBarHeight: 26,
	/** Space between the header bar and the entry photo. */
	headerGap: 20,
	photo: {
		width: 459,
		/** 16:9, matching the mockup's photo card. */
		height: 258,
		radius: 12,
	},
	title: { size: 21, marginTop: 24 },
	date: { size: 13, marginTop: 10, iconSize: 12, iconGap: 6 },
	rule: { width: 165, thickness: 1.2, marginTop: 18 },
	body: { size: 12, lineHeight: 1.65, marginTop: 24 },
	card: { ...card, height: cardHeight },
	cardLabel,
	qrPlate,
	cardCaption,
	footer: {
		/** Distance from the page bottom to the separator rule. */
		ruleOffset: 62,
		textOffset: 34,
		size: 11,
		thickness: 1,
	},
} as const;

/** Bottom padding reserved so page content never collides with the footer. */
export const PDF_CONTENT_BOTTOM_PADDING = pdfMetrics.footer.ruleOffset + 6;
