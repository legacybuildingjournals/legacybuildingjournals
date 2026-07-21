import { pdf } from "@react-pdf/renderer";
import QRCode from "qrcode";

import { MyStoryDocument } from "@/components/my-story-pdf/MyStoryDocument";
import type { MyStoryEntry } from "@/components/my-story-pdf/types";
import { formatPdfLongDate } from "@/lib/journal/formatDate";
import { getImageDimensionsFromDataUrl } from "@/lib/journal/getImageDimensions";
import type { EnrichedJournalEntry } from "@/lib/journal/journalEntryTypes";
import type { JournalStoryType } from "@/lib/journal/journalTypes";

export type JournalForPdfExport = {
	title: string;
	dateMs: number;
	type: JournalStoryType;
	dedication?: string;
	coverImageUrl?: string;
};

async function generateAudioQrDataUrl(
	audioUrl: string,
): Promise<string | null> {
	try {
		return await QRCode.toDataURL(audioUrl, { margin: 1, width: 400 });
	} catch {
		return null;
	}
}

async function fetchImageDataUrl(url: string): Promise<string | null> {
	try {
		const response = await fetch(url);
		if (!response.ok) return null;
		const blob = await response.blob();
		return await new Promise<string>((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => resolve(reader.result as string);
			reader.onerror = reject;
			reader.readAsDataURL(blob);
		});
	} catch {
		return null;
	}
}

function downloadPdfBlob(blob: Blob, filename: string) {
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement("a");
	anchor.href = url;
	anchor.download = filename;
	anchor.click();
	setTimeout(() => {
		URL.revokeObjectURL(url);
		anchor.remove();
	}, 1000);
}

async function mapEntriesToMyStory(
	entries: EnrichedJournalEntry[],
): Promise<MyStoryEntry[]> {
	return Promise.all(
		entries.map(async (entry) => {
			let imageBase64: string | undefined;
			let imageWidth: number | undefined;
			let imageHeight: number | undefined;

			if (entry.imageUrl) {
				const dataUrl = await fetchImageDataUrl(entry.imageUrl);
				if (dataUrl) {
					imageBase64 = dataUrl;
					const dimensions = await getImageDimensionsFromDataUrl(dataUrl);
					imageWidth = dimensions?.width;
					imageHeight = dimensions?.height;
				}
			}

			const audioQrBase64 = entry.audioUrl
				? ((await generateAudioQrDataUrl(entry.audioUrl)) ?? undefined)
				: undefined;

			return {
				heading: entry.title?.trim() || "Untitled entry",
				date: formatPdfLongDate(entry.dateMs),
				body: entry.body?.trim() ?? "",
				imageBase64,
				imageWidth,
				imageHeight,
				audioQrBase64,
			};
		}),
	);
}

export async function buildJournalPdfBlob({
	journal,
	includeJournal,
	entries,
}: {
	journal: JournalForPdfExport;
	includeJournal: boolean;
	entries: EnrichedJournalEntry[];
}): Promise<Blob> {
	const myStoryEntries = await mapEntriesToMyStory(entries);
	const journalName = journal.title?.trim() || "Journal";

	return pdf(
		<MyStoryDocument
			title="Story"
			journalName={journalName}
			dedication={journal.dedication}
			entries={myStoryEntries}
			includeCover={includeJournal}
			storyType={journal.type}
		/>,
	).toBlob();
}

export async function exportJournalEntriesToPdf({
	journal,
	includeJournal,
	entries,
}: {
	journal: JournalForPdfExport;
	includeJournal: boolean;
	entries: EnrichedJournalEntry[];
}): Promise<void> {
	const blob = await buildJournalPdfBlob({ journal, includeJournal, entries });
	const journalName = journal.title?.trim() || "Journal";
	const safeName = journalName.replace(/[^\w\s-]/g, "").trim() || "journal";
	downloadPdfBlob(blob, `${safeName}_entries.pdf`);
}
