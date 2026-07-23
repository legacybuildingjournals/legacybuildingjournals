import { ConvexError, v } from "convex/values";

import type { Id } from "../_generated/dataModel";
import { type MutationCtx, mutation } from "../_generated/server";
import { journalType } from "../schema";
import {
	isJournalBackgroundColor,
	normalizeJournalBackgroundColor,
} from "./appearance";
import {
	getOwnedJournal,
	requireClerkUserId,
	requirePaidJournalAccess,
} from "./auth";
import { journalLibrarySortKey } from "./sort";
import {
	deleteEntryStorageFiles,
	deleteJournalBackgroundStorage,
	deleteJournalCoverStorage,
} from "./storage";

function normalizeJournalTitle(title: string): string {
	const trimmed = title.trim();
	if (trimmed.length < 1) {
		throw new ConvexError({
			code: "INVALID_ARGUMENT",
			message: "Journal name can't be empty.",
		});
	}
	if (trimmed.length > 120) {
		throw new ConvexError({
			code: "INVALID_ARGUMENT",
			message: "Journal name must be 120 characters or less.",
		});
	}
	return trimmed;
}

async function nextSortOrderForType(
	ctx: MutationCtx,
	userId: string,
	type: "my_story" | "their_story",
): Promise<number> {
	const journals = await ctx.db
		.query("journals")
		.withIndex("by_userId_and_type", (q) =>
			q.eq("userId", userId).eq("type", type),
		)
		.collect();

	let max = 0;
	for (const journal of journals) {
		max = Math.max(max, journalLibrarySortKey(journal));
	}
	return max + 1000;
}

export const generateUploadUrl = mutation({
	args: {},
	handler: async (ctx) => {
		await requirePaidJournalAccess(ctx);
		return await ctx.storage.generateUploadUrl();
	},
});

export const create = mutation({
	args: {
		title: v.string(),
		dateMs: v.number(),
		type: journalType,
		dedication: v.optional(v.string()),
		/** Cover image is optional — native create flow allows text-only journals. */
		coverImageId: v.optional(v.id("_storage")),
		/** Optional period end date. */
		endDateMs: v.optional(v.number()),
		/** Optional inline entry log captured at creation time. */
		entryLog: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const userId = await requirePaidJournalAccess(ctx);

		let coverImageUrl: string | undefined;
		if (args.coverImageId) {
			const resolved = await ctx.storage.getUrl(args.coverImageId);
			if (!resolved) {
				throw new ConvexError({
					code: "INVALID_ARGUMENT",
					message:
						"Cover image was not found in storage. Please upload the image again.",
				});
			}
			coverImageUrl = resolved;
		}

		const trimmedEntryLog = args.entryLog?.trim();

		const now = Date.now();
		const sortOrder = await nextSortOrderForType(ctx, userId, args.type);
		return await ctx.db.insert("journals", {
			userId,
			title: args.title,
			dateMs: args.dateMs,
			type: args.type,
			dedication: args.dedication,
			coverImageId: args.coverImageId,
			coverImageUrl,
			endDateMs: args.endDateMs,
			entryLog: trimmedEntryLog ? trimmedEntryLog : undefined,
			updatedAtMs: now,
			sortOrder,
		});
	},
});

/** Persists drag-and-drop order for journals in a story tab. */
export const reorder = mutation({
	args: {
		type: journalType,
		orderedIds: v.array(v.id("journals")),
	},
	handler: async (ctx, args) => {
		const userId = await requirePaidJournalAccess(ctx);
		const journals = await ctx.db
			.query("journals")
			.withIndex("by_userId_and_type", (q) =>
				q.eq("userId", userId).eq("type", args.type),
			)
			.collect();

		if (args.orderedIds.length !== journals.length) {
			throw new ConvexError({
				code: "INVALID_ARGUMENT",
				message: "Reorder list must include every journal in this story tab.",
			});
		}

		const ownedIds = new Set(journals.map((j) => j._id));
		const seen = new Set<string>();
		for (const id of args.orderedIds) {
			if (!ownedIds.has(id)) {
				throw new ConvexError({
					code: "FORBIDDEN",
					message: "You do not have access to one or more journals.",
				});
			}
			if (seen.has(id)) {
				throw new ConvexError({
					code: "INVALID_ARGUMENT",
					message: "Duplicate journal in reorder list.",
				});
			}
			seen.add(id);
		}

		for (const [index, journalId] of args.orderedIds.entries()) {
			await ctx.db.patch(journalId, { sortOrder: index * 1000 });
		}
	},
});

export const update = mutation({
	args: {
		id: v.id("journals"),
		title: v.string(),
		dateMs: v.number(),
		type: v.optional(journalType),
		dedication: v.optional(v.string()),
		coverImageId: v.optional(v.id("_storage")),
		// `number` sets the period end, `null` clears it. Omitted (undefined) keeps
		// the existing value — so callers that don't manage the end date (web) are
		// unaffected.
		endDateMs: v.optional(v.union(v.number(), v.null())),
	},
	handler: async (ctx, args) => {
		const userId = await requirePaidJournalAccess(ctx);
		const journal = await getOwnedJournal(ctx, args.id, userId);

		let coverImageId = journal.coverImageId;
		let coverImageUrl = journal.coverImageUrl;

		if (
			args.coverImageId !== undefined &&
			args.coverImageId !== journal.coverImageId
		) {
			await deleteJournalCoverStorage(ctx, journal);
			const url = await ctx.storage.getUrl(args.coverImageId);
			if (!url) {
				throw new ConvexError({
					code: "INVALID_ARGUMENT",
					message: "Cover image was not found in storage.",
				});
			}
			coverImageId = args.coverImageId;
			coverImageUrl = url;
		}

		const nextType = args.type;
		const typeChanged = nextType !== undefined && nextType !== journal.type;
		const sortOrder =
			typeChanged && nextType !== undefined
				? await nextSortOrderForType(ctx, userId, nextType)
				: journal.sortOrder;

		await ctx.db.patch(args.id, {
			title: normalizeJournalTitle(args.title),
			dateMs: args.dateMs,
			...(args.type !== undefined ? { type: args.type } : {}),
			...(typeChanged ? { sortOrder } : {}),
			...(args.endDateMs !== undefined
				? { endDateMs: args.endDateMs ?? undefined }
				: {}),
			dedication: args.dedication,
			coverImageId,
			coverImageUrl,
			updatedAtMs: Date.now(),
		});
	},
});

/**
 * Sets a journal's background colour and/or image.
 *
 * Each field is tri-state: omitted leaves it untouched, `null` clears it, and a
 * value sets it. That lets the colour picker and the image picker write
 * independently without clobbering each other.
 */
export const setAppearance = mutation({
	args: {
		id: v.id("journals"),
		backgroundColor: v.optional(v.union(v.string(), v.null())),
		backgroundImageId: v.optional(v.union(v.id("_storage"), v.null())),
	},
	handler: async (ctx, args) => {
		const userId = await requirePaidJournalAccess(ctx);
		const journal = await getOwnedJournal(ctx, args.id, userId);

		const patch: {
			backgroundColor?: string | undefined;
			backgroundImageId?: Id<"_storage"> | undefined;
			backgroundImageUrl?: string | undefined;
			updatedAtMs: number;
		} = { updatedAtMs: Date.now() };

		if (args.backgroundColor !== undefined) {
			if (
				args.backgroundColor !== null &&
				!isJournalBackgroundColor(args.backgroundColor)
			) {
				throw new ConvexError({
					code: "INVALID_ARGUMENT",
					message: "That background colour isn't a valid hex value.",
				});
			}
			patch.backgroundColor =
				args.backgroundColor === null
					? undefined
					: normalizeJournalBackgroundColor(args.backgroundColor);
		}

		if (args.backgroundImageId !== undefined) {
			// Replacing or clearing the image frees the old file either way.
			await deleteJournalBackgroundStorage(ctx, journal);

			if (args.backgroundImageId === null) {
				patch.backgroundImageId = undefined;
				patch.backgroundImageUrl = undefined;
			} else {
				const url = await ctx.storage.getUrl(args.backgroundImageId);
				if (!url) {
					throw new ConvexError({
						code: "INVALID_ARGUMENT",
						message: "Background image was not found in storage.",
					});
				}
				patch.backgroundImageId = args.backgroundImageId;
				patch.backgroundImageUrl = url;
			}
		}

		await ctx.db.patch(args.id, patch);
	},
});

/** Lightweight title-only rename (no paid gate, no cover/date handling). */
export const rename = mutation({
	args: {
		id: v.id("journals"),
		title: v.string(),
	},
	handler: async (ctx, args) => {
		const userId = await requireClerkUserId(ctx);
		const journal = await getOwnedJournal(ctx, args.id, userId);
		const title = normalizeJournalTitle(args.title);

		await ctx.db.patch(journal._id, {
			title,
			updatedAtMs: Date.now(),
		});
	},
});

export const remove = mutation({
	args: { id: v.id("journals") },
	handler: async (ctx, args) => {
		const userId = await requirePaidJournalAccess(ctx);
		const journal = await getOwnedJournal(ctx, args.id, userId);

		const entries = await ctx.db
			.query("journalEntries")
			.withIndex("by_journalId", (q) => q.eq("journalId", args.id))
			.collect();

		for (const entry of entries) {
			await deleteEntryStorageFiles(ctx, entry);
			await ctx.db.delete(entry._id);
		}

		await deleteJournalCoverStorage(ctx, journal);
		await deleteJournalBackgroundStorage(ctx, journal);
		await ctx.db.delete(args.id);
	},
});
