import { ConvexError } from "convex/values";

import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import {
	requirePaidFeatureAccess,
	userHasPaidFeatureAccess,
} from "../stripe/access";

type AuthCtx = Pick<QueryCtx, "auth"> | Pick<MutationCtx, "auth">;

export async function requireClerkUserId(ctx: AuthCtx): Promise<string> {
	const identity = await ctx.auth.getUserIdentity();
	if (!identity) {
		throw new ConvexError({
			code: "UNAUTHENTICATED",
			message: "You must be signed in.",
		});
	}
	return identity.subject;
}

/** Require sign-in plus an active or trialing Stripe subscription for journal access. */
export async function requirePaidJournalAccess(
	ctx: QueryCtx | MutationCtx,
): Promise<string> {
	const userId = await requireClerkUserId(ctx);
	await requirePaidFeatureAccess(ctx, userId);
	return userId;
}

export function assertJournalOwner(
	journal: Doc<"journals">,
	userId: string,
): void {
	if (journal.userId !== userId) {
		throw new ConvexError({
			code: "FORBIDDEN",
			message: "You do not have access to this journal.",
		});
	}
}

export function assertEntryOwner(
	entry: Doc<"journalEntries">,
	userId: string,
): void {
	if (entry.userId !== userId) {
		throw new ConvexError({
			code: "FORBIDDEN",
			message: "You do not have access to this entry.",
		});
	}
}

export async function getOwnedJournal(
	ctx: QueryCtx | MutationCtx,
	journalId: Id<"journals">,
	userId: string,
): Promise<Doc<"journals">> {
	const journal = await ctx.db.get(journalId);
	if (!journal) {
		throw new ConvexError({
			code: "NOT_FOUND",
			message: "Journal not found.",
		});
	}
	assertJournalOwner(journal, userId);
	return journal;
}

// ──────────────────────────────────────────────────────────
// Journal sharing ("Our Story")
// ──────────────────────────────────────────────────────────

export type JournalRole = "author" | "member";

/** The accepted share of a journal, if any (at most one per journal). */
export async function getActiveShare(
	ctx: QueryCtx | MutationCtx,
	journalId: Id<"journals">,
): Promise<Doc<"journalShares"> | null> {
	const shares = await ctx.db
		.query("journalShares")
		.withIndex("by_journal", (q) => q.eq("journalId", journalId))
		.collect();
	return shares.find((share) => share.status === "active") ?? null;
}

/** The caller's role in a journal: its author, its active member, or none. */
export async function getJournalRole(
	ctx: QueryCtx | MutationCtx,
	journal: Doc<"journals">,
	userId: string,
): Promise<{ role: JournalRole; share: Doc<"journalShares"> | null } | null> {
	const share = await getActiveShare(ctx, journal._id);
	if (journal.userId === userId) return { role: "author", share };
	if (share?.memberId === userId) return { role: "member", share };
	return null;
}

/** Load a journal the caller may read (author or member), or throw. */
export async function getReadableJournal(
	ctx: QueryCtx | MutationCtx,
	journalId: Id<"journals">,
	userId: string,
): Promise<{
	journal: Doc<"journals">;
	role: JournalRole;
	share: Doc<"journalShares"> | null;
}> {
	const journal = await ctx.db.get(journalId);
	if (!journal) {
		throw new ConvexError({ code: "NOT_FOUND", message: "Journal not found." });
	}
	const access = await getJournalRole(ctx, journal, userId);
	if (!access) {
		throw new ConvexError({
			code: "FORBIDDEN",
			message: "You do not have access to this journal.",
		});
	}
	return { journal, ...access };
}

/**
 * Writing into a journal (adding, editing or deleting entries) depends on the
 * **author's** access: a member never needs their own subscription, and when
 * the author's access lapses nobody can add to the journal (spec #26/#27).
 * For an unshared journal the author is the caller, so this is the same check
 * as before.
 */
export async function requireJournalWriteAccess(
	ctx: QueryCtx | MutationCtx,
	journal: Doc<"journals">,
	role: JournalRole,
): Promise<void> {
	if (await userHasPaidFeatureAccess(ctx, journal.userId)) return;
	if (role === "member") {
		throw new ConvexError({
			code: "AUTHOR_SUBSCRIPTION_REQUIRED",
			message:
				"New entries are paused: the journal's author needs an active subscription.",
		});
	}
	throw new ConvexError({
		code: "SUBSCRIPTION_REQUIRED",
		message:
			"Subscribe and complete payment to use journal features. Visit Billing to continue.",
	});
}

/** Hidden entries are visible only to the person who created them. */
export function canSeeEntry(
	entry: Pick<Doc<"journalEntries">, "userId" | "visibility">,
	userId: string,
): boolean {
	return entry.userId === userId || entry.visibility !== "hidden";
}

/**
 * Upload URLs: allowed with your own access, or as the member of a shared
 * journal whose author has access (members don't need a subscription).
 */
export async function requireUploadAccess(
	ctx: QueryCtx | MutationCtx,
): Promise<string> {
	const userId = await requireClerkUserId(ctx);
	if (await userHasPaidFeatureAccess(ctx, userId)) return userId;
	const memberships = await ctx.db
		.query("journalShares")
		.withIndex("by_member", (q) => q.eq("memberId", userId))
		.collect();
	for (const share of memberships) {
		if (share.status !== "active") continue;
		if (await userHasPaidFeatureAccess(ctx, share.authorId)) return userId;
	}
	await requirePaidFeatureAccess(ctx, userId);
	return userId;
}
