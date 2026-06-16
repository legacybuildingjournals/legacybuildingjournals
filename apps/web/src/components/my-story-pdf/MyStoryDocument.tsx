import { Document } from "@react-pdf/renderer";

import { CoverPage } from "@/components/my-story-pdf/CoverPage";
import { DedicationPage } from "@/components/my-story-pdf/DedicationPage";
import { EntryPage } from "@/components/my-story-pdf/EntryPage";
import type { MyStoryDocumentProps } from "@/components/my-story-pdf/types";

export function MyStoryDocument({
	title = "Story",
	journalName,
	dedication,
	entries,
	includeCover = true,
	storyType = "my_story",
}: MyStoryDocumentProps) {
	const dedicationLine = dedication?.trim() ?? "";

	return (
		<Document>
			{includeCover ? (
				<CoverPage
					title={title}
					journalName={journalName}
					storyType={storyType}
				/>
			) : null}
			{includeCover && dedicationLine ? (
				<DedicationPage dedication={dedicationLine} />
			) : null}
			{entries.map((entry) => (
				<EntryPage key={`${entry.heading}-${entry.date}`} {...entry} />
			))}
		</Document>
	);
}
