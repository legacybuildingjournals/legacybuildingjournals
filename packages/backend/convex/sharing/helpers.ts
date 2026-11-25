import type { Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { deleteEntryStorageFiles } from "../journal/storage";

/** Pending share invites expire 30 days after they're sent (spec #7). */
export const SHARE_INVITE_VALIDITY_MS = 30 * 24 * 60 * 60 * 1000;

/** Web route that claims a share invite: `/share/<token>`. */
export function shareClaimPath(token: string): string {
	return `/share/${token}`;
}

export function isExpired(share: Doc<"journalShares">, now: number): boolean {
	return share.status === "pending" && share.expiresAt <= now;
}

/** "Chris Johnson" → "CJ"; used for the people row's initials avatars. */
export function initialsFor(name: string): string {
	const parts = name.trim().split(/\s+/).filter(Boolean);
	const letters = parts
		.slice(0, 2)
		.map((part) => part[0]?.toUpperCase() ?? "")
		.join("");
	return letters || "?";
}

export async function userByClerkId(
	ctx: QueryCtx | MutationCtx,
	clerkId: string,
): Promise<Doc<"users"> | null> {
	return await ctx.db
		.query("users")
		.withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
		.first();
}

/**
 * End a share: the member's entries in this journal are deleted (spec #6),
 * then the share row. The journal goes back to the author's original tab
 * automatically, because only active shares put it in "Our Story".
 */
export async function endShare(
	ctx: MutationCtx,
	share: Doc<"journalShares">,
): Promise<void> {
	if (share.memberId) {
		const memberId = share.memberId;
		const entries = await ctx.db
			.query("journalEntries")
			.withIndex("by_journalId", (q) => q.eq("journalId", share.journalId))
			.collect();
		for (const entry of entries) {
			if (entry.userId !== memberId) continue;
			await deleteEntryStorageFiles(ctx, entry);
			await ctx.db.delete(entry._id);
		}
	}
	await ctx.db.delete(share._id);
}

/**
 * Account deletion (spec #29): the user's own journals are deleted by the
 * caller (which ends their shares here first); journals they were a member
 * of lose this person's entries; their pending invites go too.
 */
export async function scrubSharesForDeletedUser(
	ctx: MutationCtx,
	clerkId: string,
): Promise<void> {
	const asAuthor = await ctx.db
		.query("journalShares")
		.withIndex("by_author", (q) => q.eq("authorId", clerkId))
		.collect();
	for (const share of asAuthor) {
		await ctx.db.delete(share._id);
	}
	const asMember = await ctx.db
		.query("journalShares")
		.withIndex("by_member", (q) => q.eq("memberId", clerkId))
		.collect();
	for (const share of asMember) {
		await endShare(ctx, share);
	}
}
