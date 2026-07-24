import { ConvexError, v } from "convex/values";

import type { Doc } from "../_generated/dataModel";
import { type MutationCtx, mutation } from "../_generated/server";
import { requireClerkUserId } from "../journal/auth";
import { generateInviteCode, normalizeInviteCode } from "./codes";

async function getUser(
	ctx: MutationCtx,
	clerkId: string,
): Promise<Doc<"users">> {
	const user = await ctx.db
		.query("users")
		.withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
		.unique();

	if (!user) {
		throw new ConvexError({
			code: "NOT_FOUND",
			message: "Your account isn't set up yet. Try again in a moment.",
		});
	}
	return user;
}

/**
 * Returns the caller's invite code, creating one on first use.
 *
 * Codes are random rather than derived from the user, so they leak nothing about
 * the person sharing them. Collisions are astronomically unlikely but cheap to
 * check, so we retry rather than assume.
 */
export const ensureInviteCode = mutation({
	args: {},
	returns: v.string(),
	handler: async (ctx) => {
		const clerkId = await requireClerkUserId(ctx);
		const user = await getUser(ctx, clerkId);
		if (user.inviteCode) return user.inviteCode;

		let code = generateInviteCode();
		for (let attempt = 0; attempt < 5; attempt += 1) {
			const taken = await ctx.db
				.query("users")
				.withIndex("by_invite_code", (q) => q.eq("inviteCode", code))
				.unique();
			if (!taken) break;
			code = generateInviteCode();
		}

		await ctx.db.patch(user._id, { inviteCode: code });
		return code;
	},
});

/**
 * Attributes the caller to whoever owns `code`.
 *
 * Deliberately only accepted during onboarding (before `welcomeCompletedAt` is
 * set) and only once. That keeps "invited" meaning "arrived through an invite",
 * and closes the obvious hole for when rewards are added later — an established
 * account can't come back and attach whichever code pays best.
 *
 * Returns a result rather than throwing for a bad code: this runs inside a
 * first-run flow that must never be blocked by a typo.
 */
export const claimInvite = mutation({
	args: {
		code: v.string(),
		via: v.union(
			v.literal("web"),
			v.literal("ios"),
			v.literal("android"),
			v.literal("manual"),
		),
	},
	returns: v.object({
		status: v.union(
			v.literal("claimed"),
			v.literal("not_found"),
			v.literal("own_code"),
			v.literal("already_invited"),
			v.literal("too_late"),
		),
		inviterFirstName: v.union(v.string(), v.null()),
	}),
	handler: async (ctx, args) => {
		const clerkId = await requireClerkUserId(ctx);
		const user = await getUser(ctx, clerkId);

		if (user.invitedBy) {
			return { status: "already_invited" as const, inviterFirstName: null };
		}
		if (user.welcomeCompletedAt) {
			return { status: "too_late" as const, inviterFirstName: null };
		}

		const code = normalizeInviteCode(args.code);
		if (!code) {
			return { status: "not_found" as const, inviterFirstName: null };
		}

		const inviter = await ctx.db
			.query("users")
			.withIndex("by_invite_code", (q) => q.eq("inviteCode", code))
			.unique();

		if (!inviter) {
			return { status: "not_found" as const, inviterFirstName: null };
		}
		if (inviter.clerkId === clerkId) {
			return { status: "own_code" as const, inviterFirstName: null };
		}

		await ctx.db.patch(user._id, {
			invitedBy: inviter.clerkId,
			invitedAt: Date.now(),
			invitedVia: args.via,
		});

		return {
			status: "claimed" as const,
			inviterFirstName: inviter.name.trim().split(/\s+/)[0] ?? null,
		};
	},
});
