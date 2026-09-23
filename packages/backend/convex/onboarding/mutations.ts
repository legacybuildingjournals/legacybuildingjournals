import { ConvexError, v } from "convex/values";

import type { Doc } from "../_generated/dataModel";
import { type MutationCtx, mutation } from "../_generated/server";
import { requireClerkUserId } from "../journal/auth";
import {
	generateClaimToken,
	isPlausibleEmail,
	normalizeEmail,
	toAnswerList,
	validateSubmission,
} from "./helpers";

const answerValidator = v.array(
	v.object({ questionId: v.string(), optionId: v.string() }),
);

const sourceValidator = v.union(
	v.literal("web"),
	v.literal("ios"),
	v.literal("android"),
);

async function linkedResponseFor(
	ctx: MutationCtx,
	clerkId: string,
): Promise<Doc<"onboardingResponses"> | null> {
	return await ctx.db
		.query("onboardingResponses")
		.withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
		.first();
}

/** Unlinked rows only — a claimed row belongs to someone and is never reused. */
async function claimableByEmail(
	ctx: MutationCtx,
	email: string,
): Promise<Doc<"onboardingResponses"> | null> {
	const rows = await ctx.db
		.query("onboardingResponses")
		.withIndex("by_email", (q) => q.eq("email", email))
		.collect();
	return rows.find((row) => row.clerkId === undefined) ?? null;
}

/**
 * Stores answers from the external pre-app form.
 *
 * Unauthenticated by necessity — the whole point is that this runs before the
 * person has an account. It is the only open write endpoint in the codebase, so
 * the bounds are deliberate: every answer is validated against the shared
 * question config, a repeat submission for the same email updates that row
 * instead of adding another, and the response body reveals nothing about
 * whether the address is already registered.
 */
export const submitExternal = mutation({
	args: {
		email: v.string(),
		recipient: v.string(),
		answers: answerValidator,
	},
	returns: v.object({ token: v.string() }),
	handler: async (ctx, args) => {
		const email = normalizeEmail(args.email);
		if (!isPlausibleEmail(email)) {
			throw new ConvexError({
				code: "INVALID_ARGUMENT",
				message: "Please enter a valid email address.",
			});
		}

		const { recipient, answers } = validateSubmission(
			args.recipient,
			args.answers,
		);
		const answerList = toAnswerList(answers);

		// Re-submitting keeps the original token so a link already sent out still
		// resolves. An already-claimed row is never touched: otherwise anyone who
		// knew a registered address could overwrite that person's answers.
		const existing = await claimableByEmail(ctx, email);
		if (existing) {
			await ctx.db.patch(existing._id, {
				recipient,
				answers: answerList,
				completedAt: Date.now(),
			});
			return { token: existing.token };
		}

		const token = generateClaimToken();
		await ctx.db.insert("onboardingResponses", {
			token,
			email,
			source: "external",
			recipient,
			answers: answerList,
			completedAt: Date.now(),
		});
		return { token };
	},
});

/**
 * Stores answers collected inside the product, already linked to the caller.
 *
 * Idempotent: a user who somehow reaches the questionnaire twice updates their
 * existing row rather than accumulating duplicates.
 */
export const submitInApp = mutation({
	args: {
		recipient: v.string(),
		answers: answerValidator,
		source: sourceValidator,
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const clerkId = await requireClerkUserId(ctx);
		const { recipient, answers } = validateSubmission(
			args.recipient,
			args.answers,
		);
		const answerList = toAnswerList(answers);

		const user = await ctx.db
			.query("users")
			.withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
			.unique();

		const existing = await linkedResponseFor(ctx, clerkId);
		const now = Date.now();

		if (existing) {
			await ctx.db.patch(existing._id, {
				recipient,
				answers: answerList,
				completedAt: now,
			});
			return null;
		}

		await ctx.db.insert("onboardingResponses", {
			token: generateClaimToken(),
			email: user ? normalizeEmail(user.email) : undefined,
			clerkId,
			source: args.source,
			recipient,
			answers: answerList,
			completedAt: now,
			linkedAt: now,
		});
		return null;
	},
});

/**
 * Attaches an existing onboarding response to the caller, so someone who
 * completed the external form never answers the questions twice.
 *
 * A `token` outranks the email: the web continuation link carries one through
 * sign-up, and the person may well register with a different address than they
 * typed into the form. Without a token — the only thing possible after an App
 * Store install — the email is the fallback.
 *
 * Returns a status rather than throwing on a miss, for the same reason
 * `claimInvite` does: this runs inside a first-run flow that must never be
 * blocked by a stale or mistyped token.
 */
export const claimOnboarding = mutation({
	args: { token: v.optional(v.string()) },
	returns: v.object({
		status: v.union(
			v.literal("claimed"),
			v.literal("already_linked"),
			v.literal("none"),
		),
	}),
	handler: async (ctx, args) => {
		const clerkId = await requireClerkUserId(ctx);

		const alreadyLinked = await linkedResponseFor(ctx, clerkId);
		if (alreadyLinked) return { status: "already_linked" as const };

		const now = Date.now();

		const token = args.token?.trim();
		if (token) {
			const byToken = await ctx.db
				.query("onboardingResponses")
				.withIndex("by_token", (q) => q.eq("token", token))
				.unique();
			// A token pointing at someone else's claimed row is ignored, not stolen.
			if (byToken && byToken.clerkId === undefined) {
				await ctx.db.patch(byToken._id, { clerkId, linkedAt: now });
				return { status: "claimed" as const };
			}
		}

		// Falling through on a bad token is deliberate — the email may still match.
		const user = await ctx.db
			.query("users")
			.withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
			.unique();
		if (!user) return { status: "none" as const };

		const byEmail = await claimableByEmail(ctx, normalizeEmail(user.email));
		if (!byEmail) return { status: "none" as const };

		await ctx.db.patch(byEmail._id, { clerkId, linkedAt: now });
		return { status: "claimed" as const };
	},
});
