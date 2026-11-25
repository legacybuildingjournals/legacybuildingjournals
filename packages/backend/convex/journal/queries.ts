import { v } from "convex/values";

import type { Doc } from "../_generated/dataModel";
import { query } from "../_generated/server";
import { libraryTab } from "../schema";
import { canSeeEntry, getJournalRole, requireClerkUserId } from "./auth";
import { enrichJournal, resolveEntryImageUrl } from "./enrich";
import { compareJournalsForLibrary } from "./sort";

export const getById = query({
	args: { id: v.id("journals") },
	handler: async (ctx, args) => {
		const userId = await requireClerkUserId(ctx);
		const journal = await ctx.db.get(args.id);
		if (!journal) return null;
		const access = await getJournalRole(ctx, journal, userId);
		// Null rather than throw: a member who just left (or was removed) still
		// has the screen mounted for a moment.
		if (!access) return null;
		return {
			...(await enrichJournal(ctx, journal)),
			viewerRole: access.role,
			isShared: access.share !== null,
		};
	},
});

/** Most recently posted journal for the desk widget, with carousel image URLs. */
export const getRecentForDesk = query({
	args: {},
	handler: async (ctx) => {
		const userId = await requireClerkUserId(ctx);

		const latestEntry = await ctx.db
			.query("journalEntries")
			.withIndex("by_userId", (q) => q.eq("userId", userId))
			.order("desc")
			.first();

		let journal: Doc<"journals"> | null = null;
		let postedAtMs: number | undefined;

		if (latestEntry) {
			journal = await ctx.db.get(latestEntry.journalId);
			// Shared journals count too (author or member).
			if (journal && !(await getJournalRole(ctx, journal, userId))) {
				journal = null;
			} else if (journal) {
				postedAtMs = latestEntry._creationTime;
			}
		}

		if (!journal) {
			journal = await ctx.db
				.query("journals")
				.withIndex("by_userId", (q) => q.eq("userId", userId))
				.order("desc")
				.first();
			if (journal) {
				postedAtMs = journal._creationTime;
			}
		}

		if (!journal || postedAtMs === undefined) {
			return null;
		}

		const enriched = await enrichJournal(ctx, journal);

		const journalEntries = await ctx.db
			.query("journalEntries")
			.withIndex("by_journalId", (q) => q.eq("journalId", journal._id))
			.collect();

		const sortedEntries = journalEntries
			.filter((entry) => canSeeEntry(entry, userId))
			.sort((a, b) => b.dateMs - a.dateMs);
		const slideImageUrls = (
			await Promise.all(
				sortedEntries.map((entry) => resolveEntryImageUrl(ctx, entry)),
			)
		).filter((url): url is string => Boolean(url));

		if (slideImageUrls.length === 0 && enriched.coverImageUrl) {
			slideImageUrls.push(enriched.coverImageUrl);
		}

		return {
			journal: enriched,
			slideImageUrls,
			postedAtMs,
		};
	},
});

export const listByType = query({
	args: {
		type: v.optional(libraryTab),
	},
	handler: async (ctx, args) => {
		const userId = await requireClerkUserId(ctx);

		// Actively shared journals live in "Our Story" for both people (spec #1).
		const authoredShares = await ctx.db
			.query("journalShares")
			.withIndex("by_author", (q) => q.eq("authorId", userId))
			.collect();
		const sharedAuthoredIds = new Set(
			authoredShares
				.filter((share) => share.status === "active")
				.map((share) => share.journalId),
		);

		let journals: Doc<"journals">[];
		if (args.type === "our_story") {
			const memberships = await ctx.db
				.query("journalShares")
				.withIndex("by_member", (q) => q.eq("memberId", userId))
				.collect();
			const ids = [
				...sharedAuthoredIds,
				...memberships
					.filter((share) => share.status === "active")
					.map((share) => share.journalId),
			];
			journals = (await Promise.all(ids.map((id) => ctx.db.get(id)))).filter(
				(journal): journal is Doc<"journals"> => journal !== null,
			);
		} else if (args.type !== undefined) {
			const storyType = args.type;
			journals = (
				await ctx.db
					.query("journals")
					.withIndex("by_userId_and_type", (q) =>
						q.eq("userId", userId).eq("type", storyType),
					)
					.collect()
			).filter((journal) => !sharedAuthoredIds.has(journal._id));
		} else {
			journals = await ctx.db
				.query("journals")
				.withIndex("by_userId", (q) => q.eq("userId", userId))
				.collect();
		}

		const sorted = [...journals].sort(compareJournalsForLibrary);

		return await Promise.all(
			sorted.map(async (journal) => ({
				...(await enrichJournal(ctx, journal)),
				viewerRole:
					journal.userId === userId ? ("author" as const) : ("member" as const),
				isShared:
					journal.userId !== userId || sharedAuthoredIds.has(journal._id),
			})),
		);
	},
});

/** Resolves a signed URL for a file in Convex storage (used by journal cards). */
export const getCoverImageUrl = query({
	args: { storageId: v.id("_storage") },
	handler: async (ctx, args) => {
		await requireClerkUserId(ctx);
		return await ctx.storage.getUrl(args.storageId);
	},
});
