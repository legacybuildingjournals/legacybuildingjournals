import type { JournalStoryType } from "@/lib/journal/journalTypes";

export type MyStoryEntry = {
	heading: string;
	date: string;
	body: string;
	imageBase64?: string;
	imageWidth?: number;
	imageHeight?: number;
};

export type MyStoryDocumentProps = {
	title?: string;
	journalName: string;
	dedication?: string;
	entries: MyStoryEntry[];
	includeCover?: boolean;
	storyType?: JournalStoryType;
};
