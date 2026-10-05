import { ConvexError, v } from "convex/values";

import { internalQuery } from "../_generated/server";
import { requirePaidFeatureAccess } from "../stripe/access";
import { assertEntryOwner, assertJournalOwner } from "./auth";
import { enrichEntry, enrichJournal } from "./enrich";

export const getBookOrderData = internalQuery({
	args: {
		journalId: v.id("journals"),
		entryIds: v.array(v.id("journalEntries")),
		clerkUserId: v.string(),
	},
	handler: async (ctx, args) => {
		await requirePaidFeatureAccess(ctx, args.clerkUserId);

		const journal = await ctx.db.get(args.journalId);
		if (!journal) {
			throw new ConvexError({
				code: "NOT_FOUND",
				message: "Journal not found.",
			});
		}
		assertJournalOwner(journal, args.clerkUserId);

		const enrichedJournal = await enrichJournal(ctx, journal);
		const uniqueEntryIds = [...new Set(args.entryIds)];

		const entries = await Promise.all(
			uniqueEntryIds.map(async (entryId) => {
				const entry = await ctx.db.get(entryId);
				if (!entry) {
					throw new ConvexError({
						code: "NOT_FOUND",
						message: "One or more entries could not be found.",
					});
				}
				assertEntryOwner(entry, args.clerkUserId);
				if (entry.journalId !== args.journalId) {
					throw new ConvexError({
						code: "INVALID_ENTRY",
						message: "Selected entries must belong to this journal.",
					});
				}
				// Every mode is printable: the renderer gives a writing entry its prose
				// page and a voice or video entry a scannable QR page instead.
				return enrichEntry(ctx, entry);
			}),
		);

		if (entries.length === 0) {
			throw new ConvexError({
				code: "INVALID_ENTRY",
				message: "Select at least one entry to order.",
			});
		}

		return {
			journal: enrichedJournal,
			entries,
		};
	},
});
