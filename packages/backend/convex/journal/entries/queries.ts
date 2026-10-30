import { v } from "convex/values";

import { query } from "../../_generated/server";
import { assertEntryOwner, requireClerkUserId } from "../auth";
import { enrichEntry } from "../enrich";
import { compareEntriesOldestFirst } from "../sort";

export const getEntryImageUrl = query({
	args: { storageId: v.id("_storage") },
	handler: async (ctx, args) => {
		await requireClerkUserId(ctx);
		return await ctx.storage.getUrl(args.storageId);
	},
});

export const getById = query({
	args: { id: v.id("journalEntries") },
	handler: async (ctx, args) => {
		const userId = await requireClerkUserId(ctx);
		const entry = await ctx.db.get(args.id);
		if (!entry) return null;
		assertEntryOwner(entry, userId);
		return enrichEntry(ctx, entry);
	},
});

/**
 * Resolves a printed QR code to its recording. Intentionally unauthenticated —
 * anyone holding the book can scan it — so it returns only what the player
 * page needs, and the entry id (unguessable) is the only capability.
 */
export const getPublicMemory = query({
	args: {
		id: v.id("journalEntries"),
		kind: v.union(v.literal("voice"), v.literal("video")),
	},
	handler: async (ctx, args) => {
		const entry = await ctx.db.get(args.id);
		if (!entry) return null;
		const { audioUrl, videoUrl } = await enrichEntry(ctx, entry);
		const url = args.kind === "video" ? videoUrl : audioUrl;
		if (!url) return null;
		return { url, title: entry.title ?? null, dateMs: entry.dateMs };
	},
});

export const listByJournal = query({
	args: { journalId: v.id("journals") },
	handler: async (ctx, args) => {
		const userId = await requireClerkUserId(ctx);

		// Gracefully return empty when the journal was just deleted — the live
		// query fires before the screen unmounts, and throwing here causes a
		// render error.
		const journal = await ctx.db.get(args.journalId);
		if (!journal) return [];
		if (journal.userId !== userId) return [];

		const entries = await ctx.db
			.query("journalEntries")
			.withIndex("by_journalId", (q) => q.eq("journalId", args.journalId))
			.collect();

		const sorted = entries.sort(compareEntriesOldestFirst);
		return await Promise.all(sorted.map((entry) => enrichEntry(ctx, entry)));
	},
});
