import type { Doc } from "@legacy-building/backend/convex/_generated/dataModel";

/** Journal entry with resolved storage URLs from list/get queries */
export type EnrichedJournalEntry = Doc<"journalEntries"> & {
	imageUrl?: string;
	audioUrl?: string;
};

export function entryAccentColor(mode: EnrichedJournalEntry["mode"]): string {
	// Both recorded kinds share the amber accent.
	return mode === "recording" || mode === "video" ? "#dca114" : "#008080";
}
