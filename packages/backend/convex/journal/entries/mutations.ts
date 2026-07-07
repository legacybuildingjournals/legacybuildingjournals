import { ConvexError, v } from "convex/values";

import { mutation } from "../../_generated/server";
import { recordEntryCreated } from "../../notifications/helpers";
import {
	assertEntryOwner,
	getOwnedJournal,
	requirePaidJournalAccess,
} from "../auth";
import { deleteEntryStorageFiles, deleteStorageFile } from "../storage";

export const create = mutation({
	args: {
		journalId: v.id("journals"),
		title: v.string(),
		dateMs: v.number(),
		body: v.optional(v.string()),
		mode: v.union(v.literal("writing"), v.literal("recording")),
		imageId: v.optional(v.id("_storage")),
		audioId: v.optional(v.id("_storage")),
		audioDurationMs: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const userId = await requirePaidJournalAccess(ctx);
		await getOwnedJournal(ctx, args.journalId, userId);

		let imageUrl: string | undefined;
		if (args.imageId) {
			imageUrl = (await ctx.storage.getUrl(args.imageId)) ?? undefined;
			if (!imageUrl) {
				throw new ConvexError({
					code: "INVALID_ARGUMENT",
					message: "Entry image was not found in storage.",
				});
			}
		}

		if (args.mode === "writing") {
			if (!args.body?.trim()) {
				throw new ConvexError({
					code: "INVALID_ARGUMENT",
					message: "Entry log is required for writing entries.",
				});
			}
		} else if (!args.audioId) {
			throw new ConvexError({
				code: "INVALID_ARGUMENT",
				message: "Audio is required for recording entries.",
			});
		}

		let audioUrl: string | undefined;
		if (args.audioId) {
			audioUrl = (await ctx.storage.getUrl(args.audioId)) ?? undefined;
			if (!audioUrl) {
				throw new ConvexError({
					code: "INVALID_ARGUMENT",
					message: "Entry audio was not found in storage.",
				});
			}
		}

		const entryId = await ctx.db.insert("journalEntries", {
			userId,
			journalId: args.journalId,
			title: args.title.trim(),
			dateMs: args.dateMs,
			body: args.body?.trim() || undefined,
			mode: args.mode,
			imageId: args.imageId,
			imageUrl,
			audioId: args.audioId,
			audioUrl,
			audioDurationMs:
				args.mode === "recording" ? args.audioDurationMs : undefined,
		});

		await ctx.db.patch(args.journalId, { updatedAtMs: Date.now() });

		// Track journaling activity (drives inactivity reminders) and report
		// whether this was the user's first entry so the client can fire the
		// local first-entry celebration notification.
		const { isFirstEntry } = await recordEntryCreated(ctx, userId);

		return { entryId, isFirstEntry };
	},
});

export const update = mutation({
	args: {
		id: v.id("journalEntries"),
		journalId: v.optional(v.id("journals")),
		title: v.string(),
		dateMs: v.number(),
		body: v.optional(v.string()),
		imageId: v.optional(v.id("_storage")),
		audioId: v.optional(v.id("_storage")),
		audioDurationMs: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const userId = await requirePaidJournalAccess(ctx);
		const entry = await ctx.db.get(args.id);
		if (!entry) {
			throw new ConvexError({
				code: "NOT_FOUND",
				message: "Entry not found.",
			});
		}
		assertEntryOwner(entry, userId);
		await getOwnedJournal(ctx, entry.journalId, userId);

		const nextJournalId = args.journalId ?? entry.journalId;
		if (nextJournalId !== entry.journalId) {
			await getOwnedJournal(ctx, nextJournalId, userId);
		}

		if (entry.mode === "writing" && !args.body?.trim()) {
			throw new ConvexError({
				code: "INVALID_ARGUMENT",
				message: "Entry log is required for writing entries.",
			});
		}

		let imageId = entry.imageId;
		let imageUrl = entry.imageUrl;
		if (args.imageId !== undefined && args.imageId !== entry.imageId) {
			await deleteStorageFile(ctx, entry.imageId);
			const url = await ctx.storage.getUrl(args.imageId);
			if (!url) {
				throw new ConvexError({
					code: "INVALID_ARGUMENT",
					message: "Entry image was not found in storage.",
				});
			}
			imageId = args.imageId;
			imageUrl = url;
		}

		let audioId = entry.audioId;
		let audioUrl = entry.audioUrl;
		let audioDurationMs = entry.audioDurationMs;
		if (entry.mode === "recording") {
			if (args.audioId !== undefined && args.audioId !== entry.audioId) {
				await deleteStorageFile(ctx, entry.audioId);
				const url = await ctx.storage.getUrl(args.audioId);
				if (!url) {
					throw new ConvexError({
						code: "INVALID_ARGUMENT",
						message: "Entry audio was not found in storage.",
					});
				}
				audioId = args.audioId;
				audioUrl = url;
				audioDurationMs = args.audioDurationMs;
			}
			if (!audioId) {
				throw new ConvexError({
					code: "INVALID_ARGUMENT",
					message: "Audio is required for recording entries.",
				});
			}
		}

		await ctx.db.patch(args.id, {
			title: args.title.trim(),
			dateMs: args.dateMs,
			journalId: nextJournalId,
			body: entry.mode === "writing" ? args.body?.trim() : entry.body,
			imageId,
			imageUrl,
			audioId,
			audioUrl,
			audioDurationMs,
		});

		const now = Date.now();
		await ctx.db.patch(entry.journalId, { updatedAtMs: now });
		if (nextJournalId !== entry.journalId) {
			await ctx.db.patch(nextJournalId, { updatedAtMs: now });
		}
	},
});

export const remove = mutation({
	args: { id: v.id("journalEntries") },
	handler: async (ctx, args) => {
		const userId = await requirePaidJournalAccess(ctx);
		const entry = await ctx.db.get(args.id);
		if (!entry) return;

		assertEntryOwner(entry, userId);
		await getOwnedJournal(ctx, entry.journalId, userId);

		await deleteEntryStorageFiles(ctx, entry);
		await ctx.db.delete(args.id);
		await ctx.db.patch(entry.journalId, { updatedAtMs: Date.now() });
	},
});
