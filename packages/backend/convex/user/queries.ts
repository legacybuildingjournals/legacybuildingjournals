import { v } from "convex/values";
import { internalQuery, query } from "../_generated/server";

function normalizeEmail(email: string) {
	return email.trim().toLowerCase();
}

/**
 * Internal: fetch a user's Stripe customer id + email by Clerk id. Used by the
 * email-change action to update the Stripe customer.
 */
export const getByClerkIdInternal = internalQuery({
	args: { clerkId: v.string() },
	handler: async (ctx, { clerkId }) => {
		const user = await ctx.db
			.query("users")
			.withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
			.unique();
		if (!user) return null;
		return {
			_id: user._id,
			email: user.email,
			stripeCustomerId: user.stripeCustomerId ?? null,
		};
	},
});

/**
 * Internal: is this email held by someone other than `exceptClerkId`?
 *
 * Email is not unique in this table and never has been — a stale row from a
 * deleted Clerk account, or a leftover from an earlier failed email change,
 * leaves more than one row on the same address. `.unique()` throws on that,
 * which turned an ordinary "is this taken?" check into a hard server error.
 * Both callers only ever compare the owner against the signed-in user, so the
 * answer is a boolean over every matching row.
 */
export const isEmailOwnedByAnotherUser = internalQuery({
	args: { email: v.string(), exceptClerkId: v.string() },
	handler: async (ctx, { email, exceptClerkId }) => {
		const normalized = normalizeEmail(email);
		const owners = await ctx.db
			.query("users")
			.withIndex("by_email", (q) => q.eq("email", normalized))
			.collect();
		return owners.some((owner) => owner.clerkId !== exceptClerkId);
	},
});

export const isAdminByEmail = query({
	args: { email: v.string() },
	handler: async (ctx, { email }) => {
		const normalized = normalizeEmail(email);
		const user = await ctx.db
			.query("users")
			.withIndex("by_email", (q) => q.eq("email", normalized))
			.unique();

		if (user) {
			return user.role === "admin";
		}
		return false;
	},
});

/** Authenticated admin check: Clerk id first, then JWT email fallback. */
export const isCurrentUserAdmin = query({
	args: {},
	handler: async (ctx) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			return false;
		}

		const user = await ctx.db
			.query("users")
			.withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
			.unique();

		if (user) {
			return user.role === "admin";
		}

		const email = identity.email?.trim().toLowerCase();
		if (!email) {
			return false;
		}

		const byEmail = await ctx.db
			.query("users")
			.withIndex("by_email", (q) => q.eq("email", email))
			.unique();

		return byEmail?.role === "admin";
	},
});

/** Internal: user info needed to send the trial reminder email. */
export const getTrialUserInfo = internalQuery({
	args: { clerkId: v.string() },
	handler: async (ctx, { clerkId }) => {
		const user = await ctx.db
			.query("users")
			.withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
			.unique();
		if (!user) return null;
		return {
			email: user.email,
			name: user.name,
			subscriptionStatus: user.subscriptionStatus ?? "none",
		};
	},
});

export const me = query({
	args: {},
	handler: async (ctx) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			return null;
		}

		const user = await ctx.db
			.query("users")
			.withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
			.unique();

		if (!user) {
			return null;
		}

		const profilePictureUrl = user.profilePictureId
			? await ctx.storage.getUrl(user.profilePictureId)
			: null;

		return { ...user, profilePictureUrl };
	},
});
