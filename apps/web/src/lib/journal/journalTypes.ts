export type StoryTab = "my_story" | "their_story";

export type StoryTabOption = {
	id: StoryTab;
	label: string;
	description: string;
};

export const STORY_TABS: StoryTabOption[] = [
	{
		id: "my_story",
		label: "My Story",
		description:
			"Select this option to capture your own life and the Legacy you want to preserve.",
	},
	{
		id: "their_story",
		label: "Their Story",
		description:
			"Select this option to document someone else's life, like your child or loved one, so their journey can be remembered and celebrated.",
	},
];

export const DEFAULT_STORY_TAB: StoryTab = "my_story";

/** Journal `type` field — same values as story tabs */
export type JournalStoryType = StoryTab;

/** Library tabs: the two story types plus "Our Story" (shared journals). */
export type LibraryTab = StoryTab | "our_story";

export const LIBRARY_TABS: { id: LibraryTab; label: string }[] = [
	...STORY_TABS.map(({ id, label }) => ({ id, label })),
	{ id: "our_story", label: "Our Story" },
];
