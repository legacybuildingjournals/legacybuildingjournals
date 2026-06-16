import { v } from "convex/values";

import { internalMutation } from "../_generated/server";

/**
 * Internal: delete a user's IAP subscription rows. Used for cleanup/testing and
 * by the account-deletion purge. Never exposed to the client.
 */
export const deleteByUserId = internalMutation({
	args: { userId: v.string() },
	handler: async (ctx, { userId }) => {
		const rows = await ctx.db
			.query("subscriptions")
			.withIndex("by_userId", (q) => q.eq("userId", userId))
			.collect();
		for (const row of rows) {
			await ctx.db.delete(row._id);
		}
		return rows.length;
	},
});
