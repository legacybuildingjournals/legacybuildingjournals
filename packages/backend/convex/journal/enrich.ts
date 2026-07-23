import type { Doc } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";

export async function resolveCoverImageUrl(
	ctx: QueryCtx,
	journal: Doc<"journals">,
): Promise<string | undefined> {
	if (journal.coverImageId) {
		return (await ctx.storage.getUrl(journal.coverImageId)) ?? undefined;
	}

	const url = journal.coverImageUrl;
	if (url?.startsWith("https://") || url?.startsWith("http://")) {
		return url;
	}

	return undefined;
}

/** Background images are stored like covers: storage id first, raw URL second. */
export async function resolveBackgroundImageUrl(
	ctx: QueryCtx,
	journal: Doc<"journals">,
): Promise<string | undefined> {
	if (journal.backgroundImageId) {
		return (await ctx.storage.getUrl(journal.backgroundImageId)) ?? undefined;
	}

	const url = journal.backgroundImageUrl;
	if (url?.startsWith("https://") || url?.startsWith("http://")) {
		return url;
	}

	return undefined;
}

export async function enrichJournal(ctx: QueryCtx, journal: Doc<"journals">) {
	const [coverImageUrl, backgroundImageUrl] = await Promise.all([
		resolveCoverImageUrl(ctx, journal),
		resolveBackgroundImageUrl(ctx, journal),
	]);
	return { ...journal, coverImageUrl, backgroundImageUrl };
}

export function journalActivityMs(journal: Doc<"journals">): number {
	return journal.updatedAtMs ?? journal._creationTime;
}

export async function resolveEntryImageUrl(
	ctx: QueryCtx,
	entry: Doc<"journalEntries">,
): Promise<string | undefined> {
	if (entry.imageId) {
		return (await ctx.storage.getUrl(entry.imageId)) ?? undefined;
	}
	const url = entry.imageUrl;
	if (url?.startsWith("https://") || url?.startsWith("http://")) {
		return url;
	}
	return undefined;
}

export async function resolveEntryAudioUrl(
	ctx: QueryCtx,
	entry: Doc<"journalEntries">,
): Promise<string | undefined> {
	if (entry.audioId) {
		return (await ctx.storage.getUrl(entry.audioId)) ?? undefined;
	}
	const url = entry.audioUrl;
	if (url?.startsWith("https://") || url?.startsWith("http://")) {
		return url;
	}
	return undefined;
}

export async function resolveEntryVideoUrl(
	ctx: QueryCtx,
	entry: Doc<"journalEntries">,
): Promise<string | undefined> {
	if (entry.videoId) {
		return (await ctx.storage.getUrl(entry.videoId)) ?? undefined;
	}
	const url = entry.videoUrl;
	if (url?.startsWith("https://") || url?.startsWith("http://")) {
		return url;
	}
	return undefined;
}

export async function enrichEntry(ctx: QueryCtx, entry: Doc<"journalEntries">) {
	const [imageUrl, audioUrl, videoUrl] = await Promise.all([
		resolveEntryImageUrl(ctx, entry),
		resolveEntryAudioUrl(ctx, entry),
		resolveEntryVideoUrl(ctx, entry),
	]);
	return { ...entry, imageUrl, audioUrl, videoUrl };
}
