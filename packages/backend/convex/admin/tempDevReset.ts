/**
 * TEMPORARY dev-only helper for verifying the onboarding flow on a simulator.
 * Delete this file once the flow has been checked.
 */

import { v } from "convex/values";

import { internalMutation } from "../_generated/server";

export const clearWelcomeByEmail = internalMutation({
	args: { email: v.string() },
	returns: v.array(
		v.object({ id: v.string(), previousWelcomeCompletedAt: v.number() }),
	),
	handler: async (ctx, args) => {
		const rows = await ctx.db
			.query("users")
			.withIndex("by_email", (q) => q.eq("email", args.email))
			.collect();

		const cleared: { id: string; previousWelcomeCompletedAt: number }[] = [];
		for (const row of rows) {
			if (row.welcomeCompletedAt === undefined) continue;
			cleared.push({
				id: row._id,
				previousWelcomeCompletedAt: row.welcomeCompletedAt,
			});
			await ctx.db.patch(row._id, { welcomeCompletedAt: undefined });
		}
		return cleared;
	},
});

/**
 * Full reset so onboarding shows again on the next launch.
 *
 * Clearing `welcomeCompletedAt` alone isn't enough: both welcome flows also
 * skip the questions whenever a linked `onboardingResponses` row exists, which
 * is what makes "answer once, never again" work across web and native. So the
 * response has to go too.
 */
export const resetOnboardingByEmail = internalMutation({
	args: { email: v.string() },
	returns: v.object({
		usersCleared: v.number(),
		responsesDeleted: v.number(),
	}),
	handler: async (ctx, args) => {
		const email = args.email.trim().toLowerCase();

		const users = await ctx.db
			.query("users")
			.withIndex("by_email", (q) => q.eq("email", email))
			.collect();

		let usersCleared = 0;
		for (const user of users) {
			if (user.welcomeCompletedAt !== undefined) {
				await ctx.db.patch(user._id, { welcomeCompletedAt: undefined });
				usersCleared += 1;
			}
		}

		// Match on the user's Clerk id as well as the email, since an in-app
		// submission stores whichever address the account had at the time.
		const clerkIds = new Set(users.map((user) => user.clerkId));
		const byEmail = await ctx.db
			.query("onboardingResponses")
			.withIndex("by_email", (q) => q.eq("email", email))
			.collect();
		const byClerk = (
			await Promise.all(
				[...clerkIds].map((clerkId) =>
					ctx.db
						.query("onboardingResponses")
						.withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
						.collect(),
				),
			)
		).flat();

		const seen = new Set<string>();
		let responsesDeleted = 0;
		for (const row of [...byEmail, ...byClerk]) {
			if (seen.has(row._id)) continue;
			seen.add(row._id);
			await ctx.db.delete(row._id);
			responsesDeleted += 1;
		}

		return { usersCleared, responsesDeleted };
	},
});

export const restoreWelcomeById = internalMutation({
	args: { id: v.id("users"), welcomeCompletedAt: v.number() },
	returns: v.null(),
	handler: async (ctx, args) => {
		await ctx.db.patch(args.id, {
			welcomeCompletedAt: args.welcomeCompletedAt,
		});
		return null;
	},
});
