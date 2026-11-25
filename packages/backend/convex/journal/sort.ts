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

/** The two fields an entry can be ordered by, and the only ones that exist. */
export type SortableEntry = { dateMs: number; _creationTime: number };

/**
 * Oldest journal date first: a journal is read front to back, and the printed
 * book is bound the same way. This is the export and book order, fixed — the
 * on-screen sort below is a view preference and never changes it.
 *
 * `dateMs` is the date the user picked, so two entries can share one; the
 * creation-time tiebreak keeps the order stable between a list render and a
 * book render.
 */
export function compareEntriesOldestFirst(
	a: SortableEntry,
	b: SortableEntry,
): number {
	return a.dateMs - b.dateMs || a._creationTime - b._creationTime;
}

/**
 * How the entry list may be ordered on screen.
 *
 * Two different questions get conflated otherwise: "when did this happen"
 * (`dateMs`, which the writer picks and can backdate by decades) and "when did
 * I write it" (`_creationTime`). Both are useful — backfilling old memories
 * reads best by journal date, while checking recent work reads best by when it
 * was added — so the list offers both and defaults to the latter.
 */
export const ENTRY_SORTS = {
	createdDesc: {
		group: "Date added",
		label: "Newest first",
		compare: (a: SortableEntry, b: SortableEntry) =>
			b._creationTime - a._creationTime,
	},
	createdAsc: {
		group: "Date added",
		label: "Oldest first",
		compare: (a: SortableEntry, b: SortableEntry) =>
			a._creationTime - b._creationTime,
	},
	dateDesc: {
		group: "Journal date",
		label: "Newest first",
		compare: (a: SortableEntry, b: SortableEntry) =>
			b.dateMs - a.dateMs || b._creationTime - a._creationTime,
	},
	dateAsc: {
		group: "Journal date",
		label: "Oldest first",
		compare: compareEntriesOldestFirst,
	},
} as const;

export type EntrySortKey = keyof typeof ENTRY_SORTS;

/**
 * What the list shows before anyone touches the control: most recently written
 * at the top, which is where someone returning to a journal looks first.
 */
export const DEFAULT_ENTRY_SORT: EntrySortKey = "createdDesc";

/** Menu order. Declared once so web and native can't drift. */
export const ENTRY_SORT_KEYS: EntrySortKey[] = [
	"createdDesc",
	"createdAsc",
	"dateDesc",
	"dateAsc",
];

export function isEntrySortKey(value: string): value is EntrySortKey {
	return value in ENTRY_SORTS;
}

export function sortEntries<T extends SortableEntry>(
	entries: T[],
	key: EntrySortKey,
): T[] {
	return [...entries].sort(ENTRY_SORTS[key].compare);
}
