import { v } from "convex/values";

import { internalMutation } from "../_generated/server";
import { syncUserSubscriptionMirror } from "./helpers";

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

/**
 * One-time backfill: populate the `users.subscriptionStatus` display mirror from
 * existing IAP (RevenueCat) subscription rows, so users who paid on Apple/Google
 * *before* the mirror-on-webhook change show up correctly in the admin panel
 * without waiting for their next RevenueCat event.
 *
 * Safe to re-run — `syncUserSubscriptionMirror` is idempotent and only upgrades a
 * mirror when IAP grants access, never clobbering a live Stripe subscriber.
 * Run once from the Convex dashboard/CLI after deploy. Internal only.
 */
export const backfillSubscriptionMirror = internalMutation({
	args: {},
	handler: async (ctx) => {
		const subs = await ctx.db.query("subscriptions").collect();

		// One sync per distinct user (a user may have several IAP rows).
		const clerkUserIds = new Set(
			subs
				.map((s) => s.userId)
				.filter((id) => !id.startsWith("$RCAnonymousID")),
		);

		let synced = 0;
		for (const clerkUserId of clerkUserIds) {
			await syncUserSubscriptionMirror(ctx, clerkUserId);
			synced += 1;
		}

		return { subscriptionRows: subs.length, usersSynced: synced };
	},
});
