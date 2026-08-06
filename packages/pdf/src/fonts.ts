import { Font } from "@react-pdf/renderer";

import { nunitoBold } from "./fonts/nunito-bold";
import { nunitoRegular } from "./fonts/nunito-regular";
import { nunitoSemibold } from "./fonts/nunito-semibold";

export const PDF_FONT_FAMILY = "Nunito";

/**
 * Weights embedded as data URLs so registration needs no filesystem or network
 * access — neither is dependable inside a Convex node action.
 */
export const pdfFontSources = [
	{ src: nunitoRegular, fontWeight: 400 as const },
	{ src: nunitoSemibold, fontWeight: 600 as const },
	{ src: nunitoBold, fontWeight: 700 as const },
];

type FontStore = typeof Font;

/**
 * Tracked per store rather than with a module-level boolean because a build can
 * end up with more than one copy of react-pdf (see below), and each copy owns
 * its own font registry.
 */
const registeredStores = new WeakSet<object>();

/**
 * Registers the document font.
 *
 * `store` exists because Convex only treats `@react-pdf/renderer` as an
 * external package when the import resolves to the backend's own
 * `node_modules`. This package resolves through its own pnpm symlink, so its
 * copy gets bundled separately — meaning the `Font` imported here is not the
 * `Font` that `renderToBuffer` consults. Server-side callers must pass their
 * own `Font` so the weights land on the instance doing the rendering.
 */
export function registerPdfFonts(store: FontStore = Font) {
	if (registeredStores.has(store)) return;
	registeredStores.add(store);

	store.register({ family: PDF_FONT_FAMILY, fonts: pdfFontSources });

	// Nunito ships no italic here; stop react-pdf hyphenating mid-word, which
	// reads badly in printed prose.
	store.registerHyphenationCallback((word) => [word]);
}
