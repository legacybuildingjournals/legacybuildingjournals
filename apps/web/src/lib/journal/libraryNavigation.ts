import type { Id } from "@legacy-building/backend/convex/_generated/dataModel";

import type { LibraryTab } from "@/lib/journal/journalTypes";

export type LibraryLocationState = {
	journalId?: Id<"journals">;
	storyTab?: LibraryTab;
	openAddEntry?: boolean;
};

export function readLibraryLocationState(
	state: unknown,
): LibraryLocationState | null {
	if (!state || typeof state !== "object") return null;
	const s = state as LibraryLocationState;
	if (!s.journalId && !s.openAddEntry && !s.storyTab) return null;
	return s;
}
