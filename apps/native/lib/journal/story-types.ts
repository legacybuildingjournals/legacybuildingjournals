export type StoryTab = "my_story" | "their_story";

export const STORY_TABS: { id: StoryTab; label: string }[] = [
	{ id: "my_story", label: "My Story" },
	{ id: "their_story", label: "Their Story" },
];

export const DEFAULT_STORY_TAB: StoryTab = "my_story";

export function isStoryTab(value: unknown): value is StoryTab {
	return value === "my_story" || value === "their_story";
}

/** Library tabs: the two story types plus "Our Story" (shared journals). */
export type LibraryTab = StoryTab | "our_story";

export const LIBRARY_TABS: { id: LibraryTab; label: string }[] = [
	...STORY_TABS,
	{ id: "our_story", label: "Our Story" },
];

export function isLibraryTab(value: unknown): value is LibraryTab {
	return isStoryTab(value) || value === "our_story";
}
