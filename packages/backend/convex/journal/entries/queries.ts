import { v } from "convex/values";

import type { Doc } from "../../_generated/dataModel";
import { type QueryCtx, query } from "../../_generated/server";
import { canSeeEntry, getJournalRole, requireClerkUserId } from "../auth";
import { enrichEntry } from "../enrich";
import { DEFAULT_ENTRY_SORT, sortEntries } from "../sort";

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
		const journal = await ctx.db.get(entry.journalId);
		if (!journal) return null;
		// Author or member of the journal, and not someone else's hidden entry.
		if (!(await getJournalRole(ctx, journal, userId))) return null;
		if (!canSeeEntry(entry, userId)) return null;
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
		// A plain string: ids come from a printed link and may be mistyped or from
		// another deployment, which should read as "not found", not throw.
		id: v.string(),
		kind: v.union(v.literal("voice"), v.literal("video")),
	},
	handler: async (ctx, args) => {
		const entryId = ctx.db.normalizeId("journalEntries", args.id);
		if (!entryId) return null;
		const entry = await ctx.db.get(entryId);
		if (!entry) return null;
		// "Not viewable" entries in shared journals never play publicly.
		if (entry.visibility === "hidden") return null;
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
		if (!(await getJournalRole(ctx, journal, userId))) return [];

		const entries = await ctx.db
			.query("journalEntries")
			.withIndex("by_journalId", (q) => q.eq("journalId", args.journalId))
			.collect();

		// The list's default view order. Clients re-sort locally when someone
		// picks a different option, so this only has to be the common case —
		// and it is deliberately *not* the export order, which stays oldest
		// journal date first regardless of what the list is showing.
		const sorted = sortEntries(entries, DEFAULT_ENTRY_SORT);
		const names = await creatorNames(ctx, sorted);
		return await Promise.all(
			sorted.map(async (entry) => {
				const visible = canSeeEntry(entry, userId);
				// Someone else's hidden entry: title, date and author only (spec #17).
				const shown = visible ? entry : lockedStub(entry);
				return {
					...(await enrichEntry(ctx, shown)),
					locked: !visible,
					isMine: entry.userId === userId,
					createdByName: names.get(entry.userId) ?? "",
				};
			}),
		);
	},
});

/** Strip everything but the title/date/mode from an entry the viewer can't see. */
function lockedStub(entry: Doc<"journalEntries">): Doc<"journalEntries"> {
	return {
		...entry,
		body: undefined,
		imageId: undefined,
		imageUrl: undefined,
		audioId: undefined,
		audioUrl: undefined,
		audioDurationMs: undefined,
		videoId: undefined,
		videoUrl: undefined,
		videoDurationMs: undefined,
	};
}

/** Display names of the people who wrote these entries ("By Michael Smith"). */
async function creatorNames(
	ctx: QueryCtx,
	entries: Doc<"journalEntries">[],
): Promise<Map<string, string>> {
	const ids = [...new Set(entries.map((entry) => entry.userId))];
	const names = new Map<string, string>();
	await Promise.all(
		ids.map(async (clerkId) => {
			const user = await ctx.db
				.query("users")
				.withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
				.first();
			names.set(clerkId, user?.name ?? "");
		}),
	);
	return names;
}
