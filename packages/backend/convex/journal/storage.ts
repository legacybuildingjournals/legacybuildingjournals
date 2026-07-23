import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

/** Deletes a file from Convex storage if present; ignores missing files. */
export async function deleteStorageFile(
	ctx: MutationCtx,
	storageId: Id<"_storage"> | undefined,
): Promise<void> {
	if (!storageId) return;
	try {
		await ctx.storage.delete(storageId);
	} catch {
		// File may already be deleted or missing.
	}
}

/** Removes all storage blobs attached to a journal entry. */
export async function deleteEntryStorageFiles(
	ctx: MutationCtx,
	entry: Pick<Doc<"journalEntries">, "imageId" | "audioId" | "videoId">,
): Promise<void> {
	await deleteStorageFile(ctx, entry.imageId);
	await deleteStorageFile(ctx, entry.audioId);
	await deleteStorageFile(ctx, entry.videoId);
}

/** Removes cover image storage for a journal. */
export async function deleteJournalCoverStorage(
	ctx: MutationCtx,
	journal: Pick<Doc<"journals">, "coverImageId">,
): Promise<void> {
	await deleteStorageFile(ctx, journal.coverImageId);
}

export async function deleteJournalBackgroundStorage(
	ctx: MutationCtx,
	journal: Pick<Doc<"journals">, "backgroundImageId">,
): Promise<void> {
	await deleteStorageFile(ctx, journal.backgroundImageId);
}
