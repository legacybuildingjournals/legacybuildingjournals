/**
 * Shared rules for ordering a printed book.
 *
 * Deliberately dependency-free: the web and native clients both import this to
 * pre-validate a selection before calling the server, so it must stay safe to
 * pull into a React Native bundle.
 */

/**
 * Peecho will not print a book shorter than this. It is the real constraint —
 * everything below exists to keep users from hitting it.
 */
export const MIN_BOOK_ORDER_PAGES = 20;

/**
 * Entry count required before ordering is offered. Each entry contributes at
 * least one page (its writing page, plus one more per attached recording), so
 * this comfortably clears {@link MIN_BOOK_ORDER_PAGES} while staying a number
 * we can check in the client before rendering anything.
 */
export const MIN_BOOK_ORDER_ENTRIES = 22;

/** Shown when a selection is too small to print. Empty when it is valid. */
export function minimumBookOrderMessage(selectedCount: number): string {
	if (selectedCount >= MIN_BOOK_ORDER_ENTRIES) return "";

	const remaining = MIN_BOOK_ORDER_ENTRIES - selectedCount;
	return `Books can be ordered with ${MIN_BOOK_ORDER_ENTRIES} entries or more. You have ${selectedCount} selected — add ${remaining} more ${
		remaining === 1 ? "entry" : "entries"
	}.`;
}

/** Shown when a rendered book still falls short of the printer's minimum. */
export function minimumBookPagesMessage(pageCount: number): string {
	return `A printed book needs at least ${MIN_BOOK_ORDER_PAGES} pages. This selection makes ${pageCount}. Add a few more entries and try again.`;
}
