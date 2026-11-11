import { ConvexError, v } from "convex/values";

import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { internalMutation, mutation } from "../_generated/server";
import {
	getUsersByEmail,
	isValidEmail,
	normalizeEmail,
} from "../gifts/helpers";
import {
	getActiveShare,
	getOwnedJournal,
	requireClerkUserId,
} from "../journal/auth";
import { requirePaidFeatureAccess } from "../stripe/access";
import {
	endShare,
	isExpired,
	SHARE_INVITE_VALIDITY_MS,
	userByClerkId,
} from "./helpers";

function fail(code: string, message: string): never {
	throw new ConvexError({ code, message });
}

/**
 * Create the pending invite (called by `sharing.actions.sendInvite`, which
 * generates the token and sends the email). One member per journal: a
 * pending invite or an active member takes the slot (spec #5).
 */
export const createInvite = internalMutation({
	args: {
		journalId: v.id("journals"),
		authorId: v.string(),
		email: v.string(),
		token: v.string(),
	},
	returns: v.object({
		shareId: v.id("journalShares"),
		inviteEmail: v.string(),
		hasAccount: v.boolean(),
		journalTitle: v.string(),
		authorName: v.string(),
	}),
	handler: async (ctx, args) => {
		const journal = await getOwnedJournal(ctx, args.journalId, args.authorId);
		await requirePaidFeatureAccess(ctx, args.authorId);
		const author = await userByClerkId(ctx, args.authorId);

		const inviteEmail = normalizeEmail(args.email);
		if (!isValidEmail(inviteEmail)) {
			fail("INVALID", "Enter a valid email address.");
		}
		if (author && normalizeEmail(author.email) === inviteEmail) {
			fail("SELF_SHARE", "You can't share a journal with yourself.");
		}

		const now = Date.now();
		const existing = await ctx.db
			.query("journalShares")
			.withIndex("by_journal", (q) => q.eq("journalId", args.journalId))
			.collect();
		for (const share of existing) {
			if (isExpired(share, now)) {
				await ctx.db.delete(share._id);
				continue;
			}
			fail(
				share.status === "active" ? "ALREADY_SHARED" : "INVITE_PENDING",
				share.status === "active"
					? "This journal is already shared. Remove the member first."
					: "There's already a pending invite for this journal. Cancel it first.",
			);
		}

		const shareId = await ctx.db.insert("journalShares", {
			journalId: args.journalId,
			authorId: args.authorId,
			inviteEmail,
			token: args.token,
			status: "pending",
			createdAt: now,
			expiresAt: now + SHARE_INVITE_VALIDITY_MS,
		});
		const accounts = await getUsersByEmail(ctx, inviteEmail);
		return {
			shareId,
			inviteEmail,
			hasAccount: accounts.length > 0,
			journalTitle: journal.title,
			authorName: author?.name ?? "Someone",
		};
	},
});

export const markInviteEmailSent = internalMutation({
	args: { shareId: v.id("journalShares") },
	returns: v.null(),
	handler: async (ctx, { shareId }) => {
		const share = await ctx.db.get(shareId);
		if (share) await ctx.db.patch(shareId, { emailSentAt: Date.now() });
		return null;
	},
});

/** Author: withdraw a pending invite, freeing the slot. */
export const cancelInvite = mutation({
	args: { journalId: v.id("journals") },
	returns: v.null(),
	handler: async (ctx, { journalId }) => {
		const userId = await requireClerkUserId(ctx);
		await getOwnedJournal(ctx, journalId, userId);
		const shares = await ctx.db
			.query("journalShares")
			.withIndex("by_journal", (q) => q.eq("journalId", journalId))
			.collect();
		for (const share of shares) {
			if (share.status === "pending") await ctx.db.delete(share._id);
		}
		return null;
	},
});

/** Author: remove the member. Their entries in this journal are deleted. */
export const removeMember = mutation({
	args: { journalId: v.id("journals") },
	returns: v.null(),
	handler: async (ctx, { journalId }) => {
		const userId = await requireClerkUserId(ctx);
		await getOwnedJournal(ctx, journalId, userId);
		const share = await getActiveShare(ctx, journalId);
		if (share) await endShare(ctx, share);
		return null;
	},
});

/** Member: leave a shared journal. Their entries in it are deleted. */
export const leaveJournal = mutation({
	args: { journalId: v.id("journals") },
	returns: v.null(),
	handler: async (ctx, { journalId }) => {
		const userId = await requireClerkUserId(ctx);
		const share = await getActiveShare(ctx, journalId);
		if (!share || share.memberId !== userId) {
			fail("NOT_MEMBER", "You're not a member of this journal.");
		}
		await endShare(ctx, share);
		return null;
	},
});

/**
 * Accept a share invite. The signed-in account's email must match the
 * invite (spec #9); from then on the share is bound to this account. No
 * decline (spec #11).
 */
export const acceptInvite = mutation({
	args: { token: v.string() },
	returns: v.object({ journalId: v.id("journals") }),
	handler: async (ctx, { token }): Promise<{ journalId: Id<"journals"> }> => {
		const userId = await requireClerkUserId(ctx);
		const user = await userByClerkId(ctx, userId);
		if (!user) {
			fail("NOT_FOUND", "We couldn't load your account. Please try again.");
		}
		const share = await ctx.db
			.query("journalShares")
			.withIndex("by_token", (q) => q.eq("token", token))
			.unique();
		if (!share) fail("INVALID_INVITE", "This invite link isn't valid.");
		if (share.status === "active") {
			if (share.memberId === userId) return { journalId: share.journalId };
			fail("ALREADY_ACCEPTED", "This invite has already been accepted.");
		}
		const now = Date.now();
		if (isExpired(share, now)) fail("EXPIRED", "This invite has expired.");
		if (share.authorId === userId) {
			fail("SELF_SHARE", "You can't accept your own invite.");
		}
		if (normalizeEmail(user.email) !== share.inviteEmail) {
			fail(
				"EMAIL_MISMATCH",
				"This invite was sent to a different email address. Sign in with that email to accept it.",
			);
		}
		const journal = await ctx.db.get(share.journalId);
		if (!journal) fail("INVALID_INVITE", "This journal no longer exists.");

		await ctx.db.patch(share._id, {
			status: "active",
			memberId: userId,
			acceptedAt: now,
		});

		// Let the author know (spec #28). Best effort.
		await ctx.scheduler.runAfter(
			0,
			internal.notifications.actions.sendPushToUser,
			{
				clerkUserId: share.authorId,
				title: "Your journal is now shared",
				body: `${user.name || "Your invitee"} joined "${journal.title}".`,
				url: `/journal/${share.journalId}`,
			},
		);
		return { journalId: share.journalId };
	},
});
