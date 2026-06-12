import { ConvexError, v } from "convex/values";

import { internal } from "../_generated/api";
import { mutation } from "../_generated/server";
import { requireAdmin } from "./helpers";

export const setUserRole = mutation({
	args: {
		userId: v.id("users"),
		role: v.union(v.literal("admin"), v.literal("user")),
	},
	handler: async (ctx, { userId, role }) => {
		const adminUser = await requireAdmin(ctx);

		const target = await ctx.db.get(userId);
		if (!target) {
			throw new ConvexError({
				code: "NOT_FOUND",
				message: "User not found.",
			});
		}

		if (target._id === adminUser._id && role !== "admin") {
			throw new ConvexError({
				code: "INVALID_OPERATION",
				message: "You cannot remove your own admin access.",
			});
		}

		await ctx.db.patch(userId, { role });

		await ctx.scheduler.runAfter(0, internal.admin.actions.syncClerkRole, {
			clerkId: target.clerkId,
			role,
		});
	},
});

export const setAccountStatus = mutation({
	args: {
		userId: v.id("users"),
		accountStatus: v.union(v.literal("active"), v.literal("suspended")),
	},
	handler: async (ctx, { userId, accountStatus }) => {
		const adminUser = await requireAdmin(ctx);

		const target = await ctx.db.get(userId);
		if (!target) {
			throw new ConvexError({
				code: "NOT_FOUND",
				message: "User not found.",
			});
		}

		if (target._id === adminUser._id && accountStatus === "suspended") {
			throw new ConvexError({
				code: "INVALID_OPERATION",
				message: "You cannot suspend your own account.",
			});
		}

		await ctx.db.patch(userId, { accountStatus });
	},
});

export const setBetaAccess = mutation({
	args: {
		userId: v.id("users"),
		betaAccess: v.boolean(),
	},
	handler: async (ctx, { userId, betaAccess }) => {
		await requireAdmin(ctx);

		const target = await ctx.db.get(userId);
		if (!target) {
			throw new ConvexError({
				code: "NOT_FOUND",
				message: "User not found.",
			});
		}

		await ctx.db.patch(userId, {
			betaAccess: betaAccess ? true : undefined,
		});
	},
});
