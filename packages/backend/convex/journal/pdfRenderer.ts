"use node";

import {
	JournalDocument,
	type JournalMemory,
	type JournalPdfEntry,
	type JournalStoryType,
	type MemoryKind,
	registerPdfFonts,
} from "@legacy-building/pdf";
import { type DocumentProps, Font, renderToBuffer } from "@react-pdf/renderer";
import QRCode from "qrcode";
import { createElement, type ReactElement } from "react";

/** The entry fields the document needs, as returned by `enrichEntry`. */
export type RenderableEntry = {
	title?: string;
	dateMs: number;
	body?: string;
	imageUrl?: string;
	audioUrl?: string;
	videoUrl?: string;
};

export type RenderableJournal = {
	title?: string;
	type: JournalStoryType;
	dedication?: string;
};

export type RenderedPdf = {
	buffer: Buffer;
	pageCount: number;
};

function formatEntryDate(ms: number): string {
	return new Date(ms).toLocaleDateString("en-US", {
		month: "long",
		day: "numeric",
		year: "numeric",
	});
}

/**
 * QR codes are embedded as data URLs rather than uploaded to storage first —
 * the renderer runs in the same process, so a round-trip through storage would
 * only add latency and orphaned files.
 *
 * `margin: 1` keeps a quiet zone around the code; the white plate it sits on
 * in the layout widens that further, so scanning stays reliable in print.
 */
async function buildMemories(entry: RenderableEntry): Promise<JournalMemory[]> {
	const sources: Array<{ kind: MemoryKind; url: string }> = [];
	if (entry.audioUrl) sources.push({ kind: "voice", url: entry.audioUrl });
	if (entry.videoUrl) sources.push({ kind: "video", url: entry.videoUrl });

	const memories: JournalMemory[] = [];
	for (const source of sources) {
		try {
			memories.push({
				kind: source.kind,
				qrDataUrl: await QRCode.toDataURL(source.url, {
					margin: 1,
					width: 600,
				}),
			});
		} catch (error) {
			// A missing QR shouldn't cost the user their whole export.
			console.error("Failed to generate memory QR code:", error);
		}
	}
	return memories;
}

async function toPdfEntry(entry: RenderableEntry): Promise<JournalPdfEntry> {
	return {
		title: entry.title?.trim() || "Untitled entry",
		date: formatEntryDate(entry.dateMs),
		body: entry.body?.trim() ?? "",
		imageUrl: entry.imageUrl,
		memories: await buildMemories(entry),
	};
}

/**
 * Counts pages by scanning the rendered PDF's object table. react-pdf does not
 * report a page count, and the count is only knowable after layout because
 * long entries reflow onto extra pages.
 */
function countPages(buffer: Buffer): number {
	const raw = buffer.toString("latin1");

	const pageObjects = raw.match(/\/Type\s*\/Page(?![\s/]*s)/g);
	if (pageObjects && pageObjects.length > 0) return pageObjects.length;

	// Fallback: the page-tree root declares the total via `/Count`.
	let max = 0;
	for (const match of raw.matchAll(/\/Count\s+(\d+)/g)) {
		const value = Number.parseInt(match[1] ?? "0", 10);
		if (value > max) max = value;
	}
	return max > 0 ? max : 1;
}

/**
 * Renders a journal to a PDF buffer. Entries are ordered oldest-first, which
 * reads more naturally in a printed book.
 */
export async function renderJournalPdf({
	journal,
	entries,
	includeFrontMatter,
}: {
	journal: RenderableJournal;
	entries: RenderableEntry[];
	includeFrontMatter: boolean;
}): Promise<RenderedPdf> {
	// Must register against *this* module's Font: the bundler gives the shared
	// pdf package its own copy of react-pdf, and only the copy `renderToBuffer`
	// comes from is consulted during layout.
	registerPdfFonts(Font);

	const ordered = [...entries].sort((a, b) => a.dateMs - b.dateMs);
	const pdfEntries = await Promise.all(ordered.map(toPdfEntry));

	// `renderToBuffer` is typed against the raw `Document` element; our wrapper
	// renders one, which the signature can't express.
	const element = createElement(JournalDocument, {
		journalName: journal.title?.trim() || "Journal",
		storyType: journal.type,
		dedication: journal.dedication,
		entries: pdfEntries,
		includeFrontMatter,
	}) as unknown as ReactElement<DocumentProps>;

	const buffer = await renderToBuffer(element);

	return { buffer, pageCount: countPages(buffer) };
}
