import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";

import { query } from "../_generated/server";
import {
	getAdminUserBillingDetail,
	mirroredPaidJournalAccess,
} from "./billing";
import {
	buildSubscriberPredicate,
	buildUserListPredicate,
	effectiveAccountStatus,
	normalizeSearchQuery,
	paginateUsersFiltered,
	requireAdmin,
	toAdminUserSummary,
	userMatchesSearch,
} from "./helpers";

const subscriptionStatusFilterValidator = v.union(
	v.literal("active"),
	v.literal("trialing"),
	v.literal("grace_period"),
	v.literal("canceled"),
	v.literal("none"),
	v.literal("unset"),
	v.literal("beta"),
);

const subscriberStatusFilterValidator = v.union(
	v.literal("active"),
	v.literal("trialing"),
	v.literal("grace_period"),
	v.literal("canceled"),
);

/** Paginated user list for admin (use with `usePaginatedQuery`). */
export const listUsers = query({
	args: {
		paginationOpts: paginationOptsValidator,
		search: v.optional(v.string()),
		accountStatus: v.optional(
			v.union(v.literal("active"), v.literal("suspended")),
		),
		role: v.optional(v.union(v.literal("admin"), v.literal("user"))),
		subscriptionStatus: v.optional(subscriptionStatusFilterValidator),
	},
	handler: async (ctx, args) => {
		await requireAdmin(ctx);

		const search = args.search?.trim() ?? "";
		const hasFilters =
			Boolean(search) ||
			Boolean(args.accountStatus) ||
			Boolean(args.role) ||
			Boolean(args.subscriptionStatus);

		if (!hasFilters) {
			const result = await ctx.db
				.query("users")
				.order("desc")
				.paginate(args.paginationOpts);
			return {
				...result,
				page: result.page.map(toAdminUserSummary),
			};
		}

		return await paginateUsersFiltered(
			ctx,
			args.paginationOpts,
			buildUserListPredicate({
				search: search || undefined,
				accountStatus: args.accountStatus,
				role: args.role,
				subscriptionStatus: args.subscriptionStatus,
			}),
		);
	},
});

/** Typeahead suggestions while searching users (admin only). */
export const searchUserSuggestions = query({
	args: { query: v.string() },
	handler: async (ctx, { query: rawQuery }) => {
		await requireAdmin(ctx);

		const q = normalizeSearchQuery(rawQuery);
		if (q.length < 2) {
			return [];
		}

		const seen = new Set<string>();
		const suggestions: ReturnType<typeof toAdminUserSummary>[] = [];

		const pushUser = (user: Parameters<typeof toAdminUserSummary>[0]) => {
			if (seen.has(user._id)) return;
			if (!userMatchesSearch(user, q)) return;
			seen.add(user._id);
			suggestions.push(toAdminUserSummary(user));
		};

		const exactEmail = await ctx.db
			.query("users")
			.withIndex("by_email", (ix) => ix.eq("email", q))
			.unique();
		if (exactEmail) pushUser(exactEmail);

		const recentBatch = await ctx.db.query("users").order("desc").take(200);
		for (const user of recentBatch) {
			if (suggestions.length >= 8) break;
			pushUser(user);
		}

		return suggestions.slice(0, 8);
	},
});

export const getUser = query({
	args: { userId: v.id("users") },
	handler: async (ctx, { userId }) => {
		await requireAdmin(ctx);

		const user = await ctx.db.get(userId);
		if (!user) {
			return null;
		}

		const journalCount = (
			await ctx.db
				.query("journals")
				.withIndex("by_userId", (q) => q.eq("userId", user.clerkId))
				.collect()
		).length;

		const entryCount = (
			await ctx.db
				.query("journalEntries")
				.withIndex("by_userId", (q) => q.eq("userId", user.clerkId))
				.collect()
		).length;

		const billing = await getAdminUserBillingDetail(ctx, user);

		return {
			...toAdminUserSummary(user),
			journalCount,
			entryCount,
			stripeCustomerId: billing.stripeCustomerId,
			billing,
		};
	},
});

export const platformInsights = query({
	args: {},
	handler: async (ctx) => {
		await requireAdmin(ctx);

		const users = await ctx.db.query("users").collect();
		const journals = await ctx.db.query("journals").collect();
		const entries = await ctx.db.query("journalEntries").collect();

		let activeAccounts = 0;
		let suspendedAccounts = 0;
		let welcomeCompleted = 0;
		let termsAgreed = 0;
		let adminCount = 0;

		const subscriptionBreakdown = {
			active: 0,
			trialing: 0,
			grace_period: 0,
			canceled: 0,
			none: 0,
			unset: 0,
			beta: 0,
		};

		let subscriptionPaidAccess = 0;

		for (const user of users) {
			if (user.role === "admin") adminCount += 1;
			if (effectiveAccountStatus(user) === "suspended") {
				suspendedAccounts += 1;
			} else {
				activeAccounts += 1;
			}
			if (user.welcomeCompletedAt) welcomeCompleted += 1;
			if (user.agreedToTermsAt) termsAgreed += 1;
			if (mirroredPaidJournalAccess(user)) subscriptionPaidAccess += 1;

			if (user.betaAccess === true) {
				subscriptionBreakdown.beta += 1;
			} else {
				const sub = user.subscriptionStatus;
				if (!sub) {
					subscriptionBreakdown.unset += 1;
				} else {
					subscriptionBreakdown[sub] += 1;
				}
			}
		}

		return {
			totalUsers: users.length,
			activeAccounts,
			suspendedAccounts,
			adminCount,
			welcomeCompleted,
			termsAgreed,
			totalJournals: journals.length,
			totalEntries: entries.length,
			subscriptionActive: subscriptionBreakdown.active,
			subscriptionTrialing: subscriptionBreakdown.trialing,
			subscriptionGracePeriod: subscriptionBreakdown.grace_period,
			subscriptionCanceled: subscriptionBreakdown.canceled,
			subscriptionNone: subscriptionBreakdown.none,
			subscriptionUnset: subscriptionBreakdown.unset,
			subscriptionBeta: subscriptionBreakdown.beta,
			subscriptionPaidAccess,
		};
	},
});

/** Paginated users with billing history (excludes none/unset). */
export const listSubscribers = query({
	args: {
		paginationOpts: paginationOptsValidator,
		search: v.optional(v.string()),
		status: v.optional(subscriberStatusFilterValidator),
	},
	handler: async (ctx, args) => {
		await requireAdmin(ctx);

		const search = args.search?.trim() ?? "";

		return await paginateUsersFiltered(
			ctx,
			args.paginationOpts,
			buildSubscriberPredicate({
				search: search || undefined,
				status: args.status,
			}),
		);
	},
});
