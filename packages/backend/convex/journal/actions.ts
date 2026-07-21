"use node";

import { ConvexError, v } from "convex/values";

import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { type ActionCtx, action } from "../_generated/server";
import {
	buildPeechoReferenceId,
	createPeechoPublication,
	DOCUGENERATE_TEMPLATE_IDS,
	estimateBookPages,
	generateAudioQrBlob,
	generateBookPdf,
	MIN_BOOK_ORDER_ENTRIES,
	mapEntriesForDocugenerate,
	minimumBookOrderMessage,
	resolveThumbnailUrl,
} from "./orderHelpers";

/**
 * For any entry with audio, renders a "scan to listen" QR (pointing at the
 * audio file) and uploads it to storage so Docugenerate can fetch it by URL.
 */
async function attachAudioQrUrls<T extends { audioUrl?: string }>(
	ctx: ActionCtx,
	entries: T[],
): Promise<(T & { audioQrUrl?: string })[]> {
	return Promise.all(
		entries.map(async (entry) => {
			if (!entry.audioUrl) return entry;
			try {
				const qrBlob = await generateAudioQrBlob(entry.audioUrl);
				const storageId = await ctx.storage.store(qrBlob);
				const audioQrUrl = await ctx.storage.getUrl(storageId);
				return { ...entry, audioQrUrl: audioQrUrl ?? undefined };
			} catch (error) {
				console.error("Failed to generate audio QR code:", error);
				return entry;
			}
		}),
	);
}

export const createBookOrderCheckout = action({
	args: {
		journalId: v.id("journals"),
		entryIds: v.array(v.id("journalEntries")),
		includeJournal: v.boolean(),
		pdfStorageId: v.optional(v.id("_storage")),
	},
	returns: v.object({ checkoutUrl: v.string() }),
	handler: async (ctx, args): Promise<{ checkoutUrl: string }> => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new ConvexError({
				code: "UNAUTHENTICATED",
				message: "You must be signed in to order a book.",
			});
		}

		const { journal, entries } = await ctx.runQuery(
			internal.journal.orderQueries.getBookOrderData,
			{
				journalId: args.journalId,
				entryIds: args.entryIds,
				clerkUserId: identity.subject,
			},
		);

		if (entries.length < MIN_BOOK_ORDER_ENTRIES) {
			throw new ConvexError({
				code: "INSUFFICIENT_ENTRIES",
				message: minimumBookOrderMessage(entries.length),
			});
		}

		const templateId = DOCUGENERATE_TEMPLATE_IDS[journal.type];
		const bookName = journal.title?.trim() || "My Legacy Book";
		const dedicationLine = journal.dedication?.trim() ?? "";
		const entriesWithQr = await attachAudioQrUrls(ctx, entries);
		const journalEntries = mapEntriesForDocugenerate(entriesWithQr);

		let pdfUrl: string;
		try {
			if (args.pdfStorageId) {
				const uploadedPdfUrl = await ctx.storage.getUrl(args.pdfStorageId);
				if (!uploadedPdfUrl) {
					throw new Error("Uploaded book PDF is no longer available.");
				}
				pdfUrl = uploadedPdfUrl;
			} else {
				pdfUrl = await generateBookPdf({
					templateId,
					bookName,
					dedicationLine,
					journalEntries,
				});
			}
		} catch (error) {
			throw new ConvexError({
				code: "PDF_GENERATION_FAILED",
				message:
					error instanceof Error
						? error.message
						: "Could not generate the book PDF.",
			});
		}

		const pages = estimateBookPages(entries.length, args.includeJournal);
		const thumbnailUrl = resolveThumbnailUrl({
			journal,
			entries,
			pdfUrl,
		});
		const referenceId = buildPeechoReferenceId(journal._id);

		let checkoutUrl: string;
		try {
			checkoutUrl = await createPeechoPublication({
				title: bookName,
				pdfUrl,
				pages,
				thumbnailUrl,
				referenceId,
			});
		} catch (error) {
			throw new ConvexError({
				code: "PEECHO_FAILED",
				message:
					error instanceof Error
						? error.message
						: "Could not start the print checkout.",
			});
		}

		if (
			checkoutUrl.startsWith("http://") ||
			checkoutUrl.startsWith("https://")
		) {
			return { checkoutUrl };
		}

		return {
			checkoutUrl: `https://www.peecho.com${checkoutUrl.startsWith("/") ? checkoutUrl : `/${checkoutUrl}`}`,
		};
	},
});

const DOCUGENERATE_URL = "https://api.docugenerate.com/v1/document";
const PEECHO_URL = "https://www.peecho.com/rest/v2/publication/create";

/** Peecho checkout page base; publication id is appended: `/print/{id}`. */
const PEECHO_CHECKOUT_BASE = "https://www.peecho.com/print";

/**
 * Peecho async-print-button credentials (Bubble parity). These are the public
 * button credentials embedded in Peecho's print button widget, not server
 * secrets — override via env if you rotate them.
 */
const PEECHO_BUTTON_KEY_DEFAULT = "177583738174766789";

type GeneratedPdf = {
	/** URL of the generated PDF. */
	url: string;
	title: string;
	/** First entry image, used as the print-product thumbnail. */
	thumbnailUrl: string;
};

/**
 * Generate a PDF of a journal (all entries, or a selected subset) via the
 * DocuGenerate API. Shared by `exportJournal` and `orderBook`.
 *
 * Set `DOCUGENERATE_AUTH_HEADER` in the Convex deployment env (raw API key
 * sent as the `Authorization` header value). Template IDs are hardcoded per
 * journal type (`my_story` vs `their_story`) with different request body shapes
 * matching the Bubble API connector.
 */
async function generateJournalPdf(
	ctx: ActionCtx,
	journalId: Id<"journals">,
	entryIds: Id<"journalEntries">[] | undefined,
): Promise<GeneratedPdf> {
	const identity = await ctx.auth.getUserIdentity();
	if (!identity) {
		throw new ConvexError({
			code: "UNAUTHENTICATED",
			message: "You must be signed in.",
		});
	}

	const authorizationHeader = process.env.DOCUGENERATE_AUTH_HEADER?.trim();
	if (!authorizationHeader) {
		throw new ConvexError({
			code: "EXPORT_NOT_CONFIGURED",
			message:
				"Export is not configured. Set DOCUGENERATE_AUTH_HEADER in the Convex environment.",
		});
	}

	// Ownership + data are enforced by these queries (auth propagates).
	const journal = await ctx.runQuery(api.journal.queries.getById, {
		id: journalId,
	});
	if (!journal) {
		throw new ConvexError({ code: "NOT_FOUND", message: "Journal not found." });
	}

	const templateId = DOCUGENERATE_TEMPLATE_IDS[journal.type];

	const allEntries = await ctx.runQuery(
		api.journal.entries.queries.listByJournal,
		{ journalId },
	);

	const selected = entryIds ? new Set<Id<"journalEntries">>(entryIds) : null;
	const entries = selected
		? allEntries.filter((e) => selected.has(e._id))
		: allEntries;

	if (entries.length === 0) {
		throw new ConvexError({
			code: "NO_ENTRIES",
			message: "There are no entries to include.",
		});
	}

	// Oldest-first reads more naturally in a printed book.
	const ordered = [...entries].sort((a, b) => a.dateMs - b.dateMs);
	const orderedWithQr = await attachAudioQrUrls(ctx, ordered);
	const journalEntries = mapEntriesForDocugenerate(orderedWithQr);

	const record = {
		book_name: journal.title,
		dedication_line: journal.dedication ?? "",
		journal_entries: journalEntries,
	};

	const sharedFields = {
		template_id: templateId,
		file: "",
		sheet: "",
		name: "",
		output_name: journal.title || "journal",
		output_format: ".pdf",
		output_quality: 100,
		single_file: true,
	};

	// Bubble parity: My Story wraps `data` in an array; Their Story uses an object.
	const payload =
		journal.type === "their_story"
			? {
					...sharedFields,
					data: record,
					page_break: true,
					merge_with: "",
					attach: "",
				}
			: {
					...sharedFields,
					data: [record],
				};

	let response: Response;
	try {
		response = await fetch(DOCUGENERATE_URL, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: authorizationHeader,
			},
			body: JSON.stringify(payload),
		});
	} catch (err) {
		throw new ConvexError({
			code: "EXPORT_REQUEST_FAILED",
			message:
				err instanceof Error
					? `Export request failed: ${err.message}`
					: "Export request failed.",
		});
	}

	const text = await response.text();
	if (!response.ok) {
		throw new ConvexError({
			code: "EXPORT_FAILED",
			message: `Export failed (status ${response.status}). ${text.slice(0, 200)}`,
		});
	}

	const url = extractDocumentUrl(text);
	if (!url) {
		throw new ConvexError({
			code: "EXPORT_NO_URL",
			message: "Export succeeded but no document URL was returned.",
		});
	}

	const thumbnailUrl = ordered.find((e) => e.imageUrl)?.imageUrl ?? "";
	return { url, title: journal.title, thumbnailUrl };
}

/**
 * Generate a journal PDF and return its URL (all entries or a selected subset).
 */
export const exportJournal = action({
	args: {
		journalId: v.id("journals"),
		/** Optional subset of entry ids; when omitted, exports the whole journal. */
		entryIds: v.optional(v.array(v.id("journalEntries"))),
	},
	returns: v.object({ url: v.string() }),
	handler: async (ctx, args) => {
		const { url } = await generateJournalPdf(
			ctx,
			args.journalId,
			args.entryIds,
		);
		return { url };
	},
});

/**
 * Generate the journal PDF, then create a Peecho print publication for it and
 * return the checkout URL where the user picks a book product, pays and orders.
 *
 * Optionally set `PEECHO_API_KEY` / `PEECHO_BUTTON_KEY` in the Convex env to
 * override the defaults.
 */
export const orderBook = action({
	args: {
		journalId: v.id("journals"),
		/** Optional subset of entry ids; when omitted, orders the whole journal. */
		entryIds: v.optional(v.array(v.id("journalEntries"))),
	},
	returns: v.object({ url: v.string() }),
	handler: async (ctx, args) => {
		const allEntries = await ctx.runQuery(
			api.journal.entries.queries.listByJournal,
			{ journalId: args.journalId },
		);
		const selected = args.entryIds
			? new Set<Id<"journalEntries">>(args.entryIds)
			: null;
		const orderEntries = selected
			? allEntries.filter((e) => selected.has(e._id))
			: allEntries;

		if (orderEntries.length < MIN_BOOK_ORDER_ENTRIES) {
			throw new ConvexError({
				code: "INSUFFICIENT_ENTRIES",
				message: minimumBookOrderMessage(orderEntries.length),
			});
		}

		const pdf = await generateJournalPdf(ctx, args.journalId, args.entryIds);
		const pages = await countPdfPages(pdf.url);

		const apiKey = process.env.PEECHO_API_KEY?.trim();
		if (!apiKey) {
			throw new ConvexError({
				code: "ORDER_NOT_CONFIGURED",
				message:
					"Ordering is not configured. Set PEECHO_API_KEY in the Convex environment.",
			});
		}
		const buttonKey =
			process.env.PEECHO_BUTTON_KEY?.trim() || PEECHO_BUTTON_KEY_DEFAULT;

		// Body shape matches the proven Bubble API-connector request exactly.
		// Note: do NOT add a plain `thumbnail` string under `product` — Peecho
		// expects structured objects there and returns a 500 JSON-parse error.
		const payload = {
			apiKey,
			buttonKey,
			currency: "USD",
			locale: "en",
			order: {
				reference: `${args.journalId}-${Date.now()}`,
				product: {
					title: pdf.title || "Journal",
					source: {
						file: {
							src: pdf.url,
							pages,
						},
					},
				},
			},
		};

		let response: Response;
		try {
			response = await fetch(PEECHO_URL, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});
		} catch (err) {
			throw new ConvexError({
				code: "ORDER_REQUEST_FAILED",
				message:
					err instanceof Error
						? `Order request failed: ${err.message}`
						: "Order request failed.",
			});
		}

		const text = await response.text();
		if (!response.ok) {
			throw new ConvexError({
				code: "ORDER_FAILED",
				message: `Could not start the order (status ${response.status}). ${text.slice(0, 200)}`,
			});
		}

		// Peecho returns the publication id (a number); the checkout page is
		// https://www.peecho.com/print/{id}.
		const publicationId = extractPublicationId(text);
		if (!publicationId) {
			throw new ConvexError({
				code: "ORDER_NO_ID",
				message: `Order created but no publication id returned. Peecho response: ${text.slice(0, 300)}`,
			});
		}

		return { url: `${PEECHO_CHECKOUT_BASE}/${publicationId}` };
	},
});

/** DocuGenerate returns `document_uri` for the generated PDF. */
function extractDocumentUrl(body: string): string | null {
	let json: unknown;
	try {
		json = JSON.parse(body);
	} catch {
		return null;
	}
	const obj = json as Record<string, unknown>;
	const candidate = obj.document_uri ?? obj.documentUri;

	if (typeof candidate === "string" && candidate.length > 0) {
		return candidate;
	}
	if (Array.isArray(candidate)) {
		const first = candidate.find((u) => typeof u === "string" && u.length > 0);
		if (typeof first === "string") return first;
	}
	return null;
}

/**
 * Count pages in a generated PDF. DocuGenerate doesn't report a page count, and
 * Peecho needs one to price the book. We fetch the PDF and parse its structure;
 * DocuGenerate output is uncompressed enough for this to be reliable. Falls back
 * to 1 if the PDF can't be read.
 */
async function countPdfPages(pdfUrl: string): Promise<number> {
	try {
		const res = await fetch(pdfUrl);
		if (!res.ok) return 1;
		const bytes = new Uint8Array(await res.arrayBuffer());

		let s = "";
		const chunk = 0x8000;
		for (let i = 0; i < bytes.length; i += chunk) {
			s += String.fromCharCode(...bytes.subarray(i, i + chunk));
		}

		// Primary: count page objects (`/Type /Page`, excluding `/Type /Pages`).
		const pageMatches = s.match(/\/Type\s*\/Page(?![\s/]*s)/g);
		if (pageMatches && pageMatches.length > 0) return pageMatches.length;

		// Fallback: the page-tree root declares total pages via `/Count`.
		let max = 0;
		const countRe = /\/Count\s+(\d+)/g;
		let m: RegExpExecArray | null = countRe.exec(s);
		while (m !== null) {
			const n = Number.parseInt(m[1] ?? "0", 10);
			if (n > max) max = n;
			m = countRe.exec(s);
		}
		return max > 0 ? max : 1;
	} catch {
		return 1;
	}
}

/**
 * Peecho's publication/create returns the new publication id as a number (the
 * body may be a bare number, a quoted string, or a JSON object with an id
 * field). We extract that id to build the checkout URL.
 */
function extractPublicationId(body: string): string | null {
	const trimmed = body.trim().replace(/^"|"$/g, "");
	if (/^\d+$/.test(trimmed)) return trimmed;

	try {
		const json = JSON.parse(body.trim());
		if (typeof json === "number") return String(json);
		if (typeof json === "string" && /^\d+$/.test(json.trim())) {
			return json.trim();
		}
		if (json && typeof json === "object") {
			const obj = json as Record<string, unknown>;
			for (const key of ["id", "publicationId", "publicationKey", "key"]) {
				const value = obj[key];
				if (typeof value === "number") return String(value);
				if (typeof value === "string" && /^\d+$/.test(value.trim())) {
					return value.trim();
				}
			}
		}
	} catch {
		// not JSON — fall through
	}

	// Last resort: first long run of digits in the response.
	const match = trimmed.match(/\d{4,}/);
	return match ? match[0] : null;
}
