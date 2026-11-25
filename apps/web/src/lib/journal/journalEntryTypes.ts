import type { Doc } from "@legacy-building/backend/convex/_generated/dataModel";
import { brand } from "@legacy-building/ui/lib/brand-journal";

/** Journal entry with resolved storage URLs from list/get queries */
export type EnrichedJournalEntry = Doc<"journalEntries"> & {
	imageUrl?: string;
	audioUrl?: string;
	/** Shared journals: someone else's hidden entry (title/date only). */
	locked?: boolean;
	/** Written by the signed-in user. */
	isMine?: boolean;
	/** Display name of the person who wrote it ("By Michael Smith"). */
	createdByName?: string;
};

/** Each medium owns an accent: teal writing, amber audio, red video — matches `accentForMode`. */
export function entryAccentColor(mode: EnrichedJournalEntry["mode"]): string {
	if (mode === "recording") return brand.alert;
	if (mode === "video") return brand.video;
	return brand.primary;
}
