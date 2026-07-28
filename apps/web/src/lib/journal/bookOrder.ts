/** Peecho minimum entries required to order a printed book. */
export const MIN_BOOK_ORDER_ENTRIES = 22;

export function minimumBookOrderMessage(selectedCount: number): string {
	if (selectedCount >= MIN_BOOK_ORDER_ENTRIES) {
		return "";
	}
	const remaining = MIN_BOOK_ORDER_ENTRIES - selectedCount;
	return `Books can be ordered with ${MIN_BOOK_ORDER_ENTRIES} entries or more. You have ${selectedCount} selected — add ${remaining} more ${
		remaining === 1 ? "entry" : "entries"
	}.`;
}
