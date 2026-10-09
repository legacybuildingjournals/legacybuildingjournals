import type { Doc } from "../_generated/dataModel";

/** Lower values appear first in the library grid. */
export function journalLibrarySortKey(journal: Doc<"journals">): number {
	return journal.sortOrder ?? journal._creationTime;
}

export function compareJournalsForLibrary(
	a: Doc<"journals">,
	b: Doc<"journals">,
): number {
	return journalLibrarySortKey(a) - journalLibrarySortKey(b);
}

/**
 * Entries read oldest first: a journal is read front to back, and the printed
 * book is bound the same way.
 *
 * `dateMs` is the date the user picked, so two entries can share one — hence
 * the creation-time tiebreak. Shared by the entry list and the PDF renderer so
 * the order on screen is the order in the book.
 */
export function compareEntriesOldestFirst(
	a: { dateMs: number; _creationTime: number },
	b: { dateMs: number; _creationTime: number },
): number {
	return a.dateMs - b.dateMs || a._creationTime - b._creationTime;
}
