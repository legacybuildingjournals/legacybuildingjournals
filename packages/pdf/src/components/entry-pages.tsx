import { Page, StyleSheet, Text } from "@react-pdf/renderer";

import { pdfColors, pdfMetrics } from "../theme";
import type { JournalMemory } from "../types";
import { EntryHeader } from "./entry-header";
import { MemoryCard } from "./memory-card";
import { contentPageStyle, HeaderBar, PageFooter } from "./page-chrome";

const styles = StyleSheet.create({
	body: {
		fontSize: pdfMetrics.body.size,
		lineHeight: pdfMetrics.body.lineHeight,
		color: pdfColors.text,
		marginTop: pdfMetrics.body.marginTop,
		marginHorizontal: pdfMetrics.bodyPaddingX,
		textAlign: "left",
	},
});

type SharedProps = {
	title: string;
	date: string;
	imageUrl?: string;
	journalName: string;
	frontMatterPages: number;
};

/** An entry's writing page: photo, title, date, then the prose. */
export function EntryWritingPage({
	title,
	date,
	imageUrl,
	body,
	journalName,
	frontMatterPages,
}: SharedProps & { body: string }) {
	return (
		<Page size="A4" style={contentPageStyle}>
			<HeaderBar />
			<EntryHeader title={title} date={date} imageUrl={imageUrl} />
			{body ? <Text style={styles.body}>{body}</Text> : null}
			<PageFooter
				journalName={journalName}
				frontMatterPages={frontMatterPages}
			/>
		</Page>
	);
}

/**
 * An entry's memory page. It repeats the photo/title/date header so a scanned
 * recording still reads as part of the same entry, then shows the QR card.
 */
export function EntryMemoryPage({
	title,
	date,
	imageUrl,
	memory,
	journalName,
	frontMatterPages,
}: SharedProps & { memory: JournalMemory }) {
	return (
		<Page size="A4" style={contentPageStyle}>
			<HeaderBar />
			<EntryHeader title={title} date={date} imageUrl={imageUrl} />
			<MemoryCard memory={memory} />
			<PageFooter
				journalName={journalName}
				frontMatterPages={frontMatterPages}
			/>
		</Page>
	);
}
