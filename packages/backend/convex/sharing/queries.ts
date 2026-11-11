import { v } from "convex/values";

import { query } from "../_generated/server";
import { maskEmail, normalizeEmail } from "../gifts/helpers";
import { getJournalRole, requireClerkUserId } from "../journal/auth";
import { userHasPaidFeatureAccess } from "../stripe/access";
import { initialsFor, isExpired, userByClerkId } from "./helpers";

const personValidator = v.object({
	name: v.string(),
	initials: v.string(),
	isYou: v.boolean(),
});

/**
 * Sharing state of one journal for the detail screen: who's in it, any
 * pending invite (author only), and whether new entries can be added (the
 * author's access gates writes for both people).
 */
export const getForJournal = query({
	args: { journalId: v.id("journals") },
	returns: v.union(
		v.null(),
		v.object({
			viewerRole: v.union(v.literal("author"), v.literal("member")),
			author: personValidator,
			member: v.union(v.null(), personValidator),
			pendingInvite: v.union(v.null(), v.object({ email: v.string() })),
			canAddEntries: v.boolean(),
		}),
	),
	handler: async (ctx, { journalId }) => {
		const userId = await requireClerkUserId(ctx);
		const journal = await ctx.db.get(journalId);
		if (!journal) return null;
		const access = await getJournalRole(ctx, journal, userId);
		if (!access) return null;

		const authorUser = await userByClerkId(ctx, journal.userId);
		const authorName = authorUser?.name || "Author";
		const share = access.share;
		const memberUser = share?.memberId
			? await userByClerkId(ctx, share.memberId)
			: null;
		const memberName = memberUser?.name || "Member";

		let pendingInvite: { email: string } | null = null;
		if (access.role === "author") {
			const shares = await ctx.db
				.query("journalShares")
				.withIndex("by_journal", (q) => q.eq("journalId", journalId))
				.collect();
			const pending = shares.find(
				(row) => row.status === "pending" && !isExpired(row, Date.now()),
			);
			if (pending) pendingInvite = { email: pending.inviteEmail };
		}

		return {
			viewerRole: access.role,
			author: {
				name: authorName,
				initials: initialsFor(authorName),
				isYou: journal.userId === userId,
			},
			member: share?.memberId
				? {
						name: memberName,
						initials: initialsFor(memberName),
						isYou: share.memberId === userId,
					}
				: null,
			pendingInvite,
			canAddEntries: await userHasPaidFeatureAccess(ctx, journal.userId),
		};
	},
});

/**
 * Pending invites addressed to the signed-in user's email. Drives the
 * "Share Journal Invite" popup for people who already have an account
 * (spec #8/#10).
 */
export const myPendingInvites = query({
	args: {},
	returns: v.array(
		v.object({
			token: v.string(),
			journalTitle: v.string(),
			authorName: v.string(),
		}),
	),
	handler: async (ctx) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) return [];
		const user = await userByClerkId(ctx, identity.subject);
		if (!user) return [];
		const now = Date.now();
		const shares = await ctx.db
			.query("journalShares")
			.withIndex("by_invite_email", (q) =>
				q.eq("inviteEmail", normalizeEmail(user.email)),
			)
			.collect();
		const pending = shares.filter(
			(share) =>
				share.status === "pending" &&
				!isExpired(share, now) &&
				share.authorId !== identity.subject,
		);
		return await Promise.all(
			pending.map(async (share) => {
				const journal = await ctx.db.get(share.journalId);
				const author = await userByClerkId(ctx, share.authorId);
				return {
					token: share.token,
					journalTitle: journal?.title ?? "A journal",
					authorName: author?.name || "Someone",
				};
			}),
		);
	},
});

/** Public: what the `/share/<token>` claim page needs. */
export const getInviteByToken = query({
	args: { token: v.string() },
	returns: v.union(
		v.null(),
		v.object({
			status: v.union(
				v.literal("pending"),
				v.literal("accepted"),
				v.literal("expired"),
			),
			journalId: v.id("journals"),
			journalTitle: v.string(),
			authorName: v.string(),
			inviteEmail: v.string(),
			maskedInviteEmail: v.string(),
			hasAccountForEmail: v.boolean(),
			viewer: v.union(
				v.null(),
				v.object({
					email: v.string(),
					emailMatches: v.boolean(),
					isMember: v.boolean(),
				}),
			),
		}),
	),
	handler: async (ctx, { token }) => {
		if (!token.trim()) return null;
		const share = await ctx.db
			.query("journalShares")
			.withIndex("by_token", (q) => q.eq("token", token))
			.unique();
		if (!share) return null;
		const journal = await ctx.db.get(share.journalId);
		if (!journal) return null;
		const author = await userByClerkId(ctx, share.authorId);

		const identity = await ctx.auth.getUserIdentity();
		const viewerUser = identity
			? await userByClerkId(ctx, identity.subject)
			: null;
		const viewerEmail = viewerUser?.email ?? identity?.email ?? null;
		const account = await ctx.db
			.query("users")
			.withIndex("by_email", (q) => q.eq("email", share.inviteEmail))
			.first();

		return {
			status:
				share.status === "active"
					? ("accepted" as const)
					: isExpired(share, Date.now())
						? ("expired" as const)
						: ("pending" as const),
			journalId: share.journalId,
			journalTitle: journal.title,
			authorName: author?.name || "Someone",
			inviteEmail: share.inviteEmail,
			maskedInviteEmail: maskEmail(share.inviteEmail),
			hasAccountForEmail: account !== null,
			viewer: viewerEmail
				? {
						email: viewerEmail,
						emailMatches: normalizeEmail(viewerEmail) === share.inviteEmail,
						isMember: identity?.subject === share.memberId,
					}
				: null,
		};
	},
});

/** True when the user is a member of any shared journal (onboarding copy). */
export const isSharedJournalMember = query({
	args: {},
	returns: v.boolean(),
	handler: async (ctx) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) return false;
		const share = await ctx.db
			.query("journalShares")
			.withIndex("by_member", (q) => q.eq("memberId", identity.subject))
			.first();
		return share !== null;
	},
});
