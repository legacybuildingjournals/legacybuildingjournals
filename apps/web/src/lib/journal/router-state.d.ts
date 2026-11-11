import type { Id } from "@legacy-building/backend/convex/_generated/dataModel";

import type { LibraryTab } from "@/lib/journal/journalTypes";

declare module "@tanstack/react-router" {
	interface HistoryState {
		journalId?: Id<"journals">;
		storyTab?: LibraryTab;
		openAddEntry?: boolean;
		skeleton?: boolean;
	}
}
