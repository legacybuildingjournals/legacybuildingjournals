import { v } from "convex/values";

import { query } from "../_generated/server";

/**
 * The caller's onboarding answers, or `null` if they haven't completed the
 * questionnaire through either entry point.
 *
 * Both welcome flows read this to decide whether to show the questions, so it
 * returns `null` for an anonymous caller rather than throwing — same contract
 * as `user.queries.me`, and it is queried while auth is still settling.
 */
export const myResponse = query({
	args: {},
	returns: v.union(
		v.object({
			recipient: v.string(),
			answers: v.array(
				v.object({ questionId: v.string(), optionId: v.string() }),
			),
			completedAt: v.number(),
		}),
		v.null(),
	),
	handler: async (ctx) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) return null;

		const response = await ctx.db
			.query("onboardingResponses")
			.withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
			.first();
		if (!response) return null;

		return {
			recipient: response.recipient,
			answers: response.answers,
			completedAt: response.completedAt,
		};
	},
});
