import { v } from "convex/values";

import { query } from "../_generated/server";
import { requireClerkUserId } from "../journal/auth";
import { normalizeInviteCode } from "./codes";

/**
 * The signed-in user's invite code and how many people have joined through it.
 *
 * `invitedCount` is derived from the `by_invited_by` index rather than a stored
 * counter, so it can never drift from reality — if an invited account is
 * deleted, the number reflects that.
 */
export const getMyInviteSummary = query({
	args: {},
	returns: v.object({
		inviteCode: v.union(v.string(), v.null()),
		invitedCount: v.number(),
	}),
	handler: async (ctx) => {
		const clerkId = await requireClerkUserId(ctx);

		const user = await ctx.db
			.query("users")
			.withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
			.unique();

		const invited = await ctx.db
			.query("users")
			.withIndex("by_invited_by", (q) => q.eq("invitedBy", clerkId))
			.collect();

		return {
			inviteCode: user?.inviteCode ?? null,
			invitedCount: invited.length,
		};
	},
});

/**
 * Checks a code typed during onboarding.
 *
 * Requires a signed-in caller so this can't be used to enumerate codes, and
 * returns only the inviter's first name — enough to confirm "you're joining
 * through Sarah" without exposing anything else about them.
 */
export const getInviteCodeInfo = query({
	args: { code: v.string() },
	returns: v.object({
		valid: v.boolean(),
		isOwnCode: v.boolean(),
		inviterFirstName: v.union(v.string(), v.null()),
	}),
	handler: async (ctx, args) => {
		const clerkId = await requireClerkUserId(ctx);
		const code = normalizeInviteCode(args.code);

		if (!code) {
			return { valid: false, isOwnCode: false, inviterFirstName: null };
		}

		const inviter = await ctx.db
			.query("users")
			.withIndex("by_invite_code", (q) => q.eq("inviteCode", code))
			.unique();

		if (!inviter) {
			return { valid: false, isOwnCode: false, inviterFirstName: null };
		}
		if (inviter.clerkId === clerkId) {
			return { valid: false, isOwnCode: true, inviterFirstName: null };
		}

		return {
			valid: true,
			isOwnCode: false,
			inviterFirstName: inviter.name.trim().split(/\s+/)[0] ?? null,
		};
	},
});

/**
 * Invite details for the public landing page, before anyone signs in.
 *
 * Unauthenticated by necessity — the visitor doesn't have an account yet. It
 * returns only whether the code works and the inviter's first name, which the
 * person sharing the link has already told them. Codes are 8 characters from a
 * 31-character alphabet (~8.5e11 combinations), so scraping names this way is
 * not practical.
 */
export const getPublicInviteInfo = query({
	args: { code: v.string() },
	returns: v.object({
		valid: v.boolean(),
		inviterFirstName: v.union(v.string(), v.null()),
	}),
	handler: async (ctx, args) => {
		const code = normalizeInviteCode(args.code);
		if (!code) return { valid: false, inviterFirstName: null };

		const inviter = await ctx.db
			.query("users")
			.withIndex("by_invite_code", (q) => q.eq("inviteCode", code))
			.unique();

		if (!inviter) return { valid: false, inviterFirstName: null };

		return {
			valid: true,
			inviterFirstName: inviter.name.trim().split(/\s+/)[0] ?? null,
		};
	},
});
