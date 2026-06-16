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

/** Internal: look up who owns an email in Convex (if anyone). */
export const getByEmailInternal = internalQuery({
	args: { email: v.string() },
	handler: async (ctx, { email }) => {
		const normalized = normalizeEmail(email);
		const user = await ctx.db
			.query("users")
			.withIndex("by_email", (q) => q.eq("email", normalized))
			.unique();
		if (!user) return null;
		return { clerkId: user.clerkId };
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
