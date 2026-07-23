/**
 * The PDF itself is rendered server-side (`journal.actions.exportJournal`) so
 * web and native produce byte-identical books from one template. This module
 * only turns the returned storage URL into a browser download.
 */

function downloadBlob(blob: Blob, filename: string) {
	const objectUrl = URL.createObjectURL(blob);
	const anchor = document.createElement("a");
	anchor.href = objectUrl;
	anchor.download = filename;
	anchor.click();
	setTimeout(() => {
		URL.revokeObjectURL(objectUrl);
		anchor.remove();
	}, 1000);
}

export function journalPdfFilename(journalTitle: string): string {
	const name = journalTitle.trim() || "Journal";
	const safeName = name.replace(/[^\w\s-]/g, "").trim() || "journal";
	return `${safeName}_entries.pdf`;
}

/**
 * Fetches the rendered PDF and saves it with a readable filename. Navigating
 * straight to the storage URL would open the PDF in a tab named after its
 * storage id instead.
 */
export async function downloadJournalPdf({
	url,
	journalTitle,
}: {
	url: string;
	journalTitle: string;
}): Promise<void> {
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error("The exported PDF could not be downloaded.");
	}
	downloadBlob(await response.blob(), journalPdfFilename(journalTitle));
}
