"use node";

import { ConvexError, v } from "convex/values";

import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { type ActionCtx, action } from "../_generated/server";
import {
	buildPeechoReferenceId,
	createPeechoPublication,
	resolveThumbnailUrl,
} from "./orderHelpers";
import {
	MIN_BOOK_ORDER_ENTRIES,
	MIN_BOOK_ORDER_PAGES,
	minimumBookOrderMessage,
	minimumBookPagesMessage,
} from "./orderRules";
import {
	type RenderableEntry,
	type RenderableJournal,
	renderJournalPdf,
} from "./pdfRenderer";

/** Mirrors the limits in the clients' back cover forms. */
const BACK_COVER_TITLE_MAX = 60;
const BACK_COVER_MESSAGE_MAX = 500;

type StoredPdf = {
	url: string;
	pageCount: number;
};

/**
 * Renders a journal PDF and puts it in Convex storage, returning a URL both
 * clients can open and Peecho can fetch.
 */
async function renderAndStore(
	ctx: ActionCtx,
	args: {
		journal: RenderableJournal;
		entries: RenderableEntry[];
		includeFrontMatter: boolean;
		backCover?: Parameters<typeof renderJournalPdf>[0]["backCover"];
	},
): Promise<StoredPdf> {
	let rendered: Awaited<ReturnType<typeof renderJournalPdf>>;
	try {
		rendered = await renderJournalPdf(args);
	} catch (error) {
		throw new ConvexError({
			code: "PDF_GENERATION_FAILED",
			message:
				error instanceof Error
					? `Could not build the PDF: ${error.message}`
					: "Could not build the PDF.",
		});
	}

	const storageId = await ctx.storage.store(
		new Blob([new Uint8Array(rendered.buffer)], { type: "application/pdf" }),
	);
	const url = await ctx.storage.getUrl(storageId);
	if (!url) {
		throw new ConvexError({
			code: "PDF_GENERATION_FAILED",
			message: "The PDF was generated but could not be saved.",
		});
	}

	return { url, pageCount: rendered.pageCount };
}

/**
 * Generate a journal PDF and return its URL (all entries, or a selected
 * subset). Shared by web and native.
 */
export const exportJournal = action({
	args: {
		journalId: v.id("journals"),
		/** Optional subset of entry ids; when omitted, exports the whole journal. */
		entryIds: v.optional(v.array(v.id("journalEntries"))),
		/**
		 * Export Book flow: the user's back cover. The photo is uploaded just
		 * before export and deleted once the PDF is built — the PDF keeps its own
		 * copy, and the client keeps the picked file for another export.
		 */
		backCover: v.optional(
			v.object({
				imageStorageId: v.optional(v.id("_storage")),
				title: v.optional(v.string()),
				message: v.optional(v.string()),
			}),
		),
	},
	returns: v.object({ url: v.string() }),
	handler: async (ctx, args): Promise<{ url: string }> => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new ConvexError({
				code: "UNAUTHENTICATED",
				message: "You must be signed in.",
			});
		}

		// Ownership is enforced by these queries (auth propagates).
		const journal = await ctx.runQuery(api.journal.queries.getById, {
			id: args.journalId,
		});
		if (!journal) {
			throw new ConvexError({
				code: "NOT_FOUND",
				message: "Journal not found.",
			});
		}

		// Shared journals: someone else's hidden entries are never exported.
		const allEntries = (
			await ctx.runQuery(api.journal.entries.queries.listByJournal, {
				journalId: args.journalId,
			})
		).filter((entry) => !entry.locked);

		const selected = args.entryIds
			? new Set<Id<"journalEntries">>(args.entryIds)
			: null;
		const entries = selected
			? allEntries.filter((entry) => selected.has(entry._id))
			: allEntries;

		if (entries.length === 0) {
			throw new ConvexError({
				code: "NO_ENTRIES",
				message: "There are no entries to include.",
			});
		}

		// The cover and dedication only make sense for a whole-journal export.
		//
		// Measured against what was actually included rather than whether ids were
		// passed: selecting every entry is the same intent as exporting the
		// journal, and the clients expressed that differently — web omitted the
		// ids, native always sent the full list, so native silently lost its
		// cover and dedication pages.
		const backCover = args.backCover;
		if (backCover) {
			if ((backCover.title?.trim().length ?? 0) > BACK_COVER_TITLE_MAX) {
				throw new ConvexError({
					code: "INVALID_BACK_COVER",
					message: `Keep the back cover title under ${BACK_COVER_TITLE_MAX} characters.`,
				});
			}
			if ((backCover.message?.trim().length ?? 0) > BACK_COVER_MESSAGE_MAX) {
				throw new ConvexError({
					code: "INVALID_BACK_COVER",
					message: `Keep the back cover message under ${BACK_COVER_MESSAGE_MAX} characters.`,
				});
			}
		}
		const backCoverImageUrl = backCover?.imageStorageId
			? await ctx.storage.getUrl(backCover.imageStorageId)
			: null;

		try {
			const { url } = await renderAndStore(ctx, {
				journal,
				entries,
				includeFrontMatter: entries.length === allEntries.length,
				backCover: backCover
					? {
							imageUrl: backCoverImageUrl ?? undefined,
							title: backCover.title?.trim(),
							message: backCover.message?.trim(),
						}
					: undefined,
			});
			return { url };
		} finally {
			if (backCover?.imageStorageId) {
				await ctx.storage
					.delete(backCover.imageStorageId)
					.catch(() => undefined);
			}
		}
	},
});

/**
 * Render the book, then create a Peecho print publication for it and return
 * the checkout URL where the user picks a product, pays and orders.
 *
 * Set `PEECHO_API_KEY` / `PEECHO_BUTTON_KEY` in the Convex environment.
 */
export const createBookOrderCheckout = action({
	args: {
		journalId: v.id("journals"),
		entryIds: v.array(v.id("journalEntries")),
		includeJournal: v.boolean(),
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

		const { url: pdfUrl, pageCount } = await renderAndStore(ctx, {
			journal,
			entries,
			includeFrontMatter: args.includeJournal,
		});

		// The real printer constraint, checked against the rendered page count
		// rather than an estimate.
		if (pageCount < MIN_BOOK_ORDER_PAGES) {
			throw new ConvexError({
				code: "INSUFFICIENT_PAGES",
				message: minimumBookPagesMessage(pageCount),
			});
		}

		try {
			const checkoutUrl = await createPeechoPublication({
				title: journal.title?.trim() || "My Legacy Book",
				pdfUrl,
				pages: pageCount,
				thumbnailUrl: resolveThumbnailUrl({ journal, entries, pdfUrl }),
				referenceId: buildPeechoReferenceId(journal._id),
			});

			return { checkoutUrl };
		} catch (error) {
			throw new ConvexError({
				code: "PEECHO_FAILED",
				message:
					error instanceof Error
						? error.message
						: "Could not start the print checkout.",
			});
		}
	},
});
