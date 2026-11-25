import { Document } from "@react-pdf/renderer";
import { Fragment } from "react";

import { registerPdfFonts } from "../fonts";
import type { JournalPdfDocumentProps } from "../types";
import { BackCoverPage } from "./back-cover";
import { EntryMemoryPage, EntryWritingPage } from "./entry-pages";
import { FrontCoverPage } from "./front-cover";
import { CoverPage, DedicationPage } from "./front-matter";

/**
 * Page order per entry: the writing page first (skipped when an entry is a
 * bare recording with no prose), then one page per attached memory.
 */
export function JournalDocument({
	journalName,
	storyType,
	entries,
	dedication,
	includeFrontMatter,
	frontCover = false,
	backCover,
}: JournalPdfDocumentProps) {
	registerPdfFonts();

	const dedicationLine = dedication?.trim() ?? "";
	const showDedication = includeFrontMatter && dedicationLine.length > 0;
	// The fixed Legacy Building cover replaces the text "My/Their Story" cover
	// page; the dedication page still follows it for whole-journal exports.
	const showTextCover = includeFrontMatter && !frontCover;
	const frontMatterPages =
		(frontCover ? 1 : 0) + (showTextCover ? 1 : 0) + (showDedication ? 1 : 0);

	return (
		<Document title={journalName}>
			{frontCover ? <FrontCoverPage /> : null}
			{showTextCover ? (
				<CoverPage journalName={journalName} storyType={storyType} />
			) : null}
			{showDedication ? <DedicationPage dedication={dedicationLine} /> : null}
			{entries.map((entry, index) => {
				const body = entry.body.trim();
				const shared = {
					title: entry.title,
					date: entry.date,
					imageUrl: entry.imageUrl,
					journalName,
					frontMatterPages,
				};
				// Two entries can legitimately share a title and date, so position is
				// the only identity available. Safe here: this tree is rendered once
				// into a static document and never reordered or re-reconciled.
				const key = `entry-${index}`;

				return (
					<Fragment key={key}>
						{body || entry.memories.length === 0 ? (
							<EntryWritingPage {...shared} body={body} />
						) : null}
						{entry.memories.map((memory) => (
							<EntryMemoryPage
								key={`${key}-${memory.kind}-${memory.qrDataUrl.slice(-24)}`}
								{...shared}
								memory={memory}
							/>
						))}
					</Fragment>
				);
			})}
			{backCover ? <BackCoverPage {...backCover} /> : null}
		</Document>
	);
}
