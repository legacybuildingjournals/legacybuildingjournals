export type JournalStoryType = "my_story" | "their_story";

/**
 * A scannable recording attached to an entry. Audio is all that exists today;
 * `video` is wired through the layout so adding video recordings later is a
 * data change rather than a design change.
 */
export type MemoryKind = "voice" | "video";

export type JournalMemory = {
	kind: MemoryKind;
	/** QR code rendered as a PNG data URL. */
	qrDataUrl: string;
};

export type JournalPdfEntry = {
	title: string;
	/** Pre-formatted for display, e.g. "June 10, 2026". */
	date: string;
	body: string;
	/** Data URL or an https URL the renderer can fetch. */
	imageUrl?: string;
	memories: JournalMemory[];
};

export type JournalPdfDocumentProps = {
	journalName: string;
	storyType: JournalStoryType;
	entries: JournalPdfEntry[];
	dedication?: string;
	/** Cover + dedication pages. Omitted when exporting a subset of entries. */
	includeFrontMatter: boolean;
};
