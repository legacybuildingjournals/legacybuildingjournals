import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";

import { query } from "../_generated/server";
import { giftDisplayStatus, normalizeEmail } from "../gifts/helpers";
import {
	getAdminUserBillingDetail,
	mirroredPaidJournalAccess,
} from "./billing";
import {
	buildUserListPredicate,
	effectiveAccountStatus,
	normalizeSearchQuery,
	paginateSubscribers,
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

		// Email is not unique in this table — a row orphaned by a deleted Clerk
		// account leaves two on the same address. `.unique()` threw there, which
		// broke admin search on precisely the accounts worth looking into. Show
		// every exact match instead, so the duplicates are visible.
		const exactEmailMatches = await ctx.db
			.query("users")
			.withIndex("by_email", (ix) => ix.eq("email", q))
			.collect();
		for (const match of exactEmailMatches) {
			if (seen.has(match._id)) continue;
			seen.add(match._id);
			suggestions.push(toAdminUserSummary(match));
		}

		// Exact-email above only covers a full match. Everything else — a
		// partial name or email — needs a real scan: matching against just the
		// most-recently-created users silently hid anyone whose account
		// predates the last couple hundred signups. This is a single-shot
		// typeahead (no loadMore loop like the Users table has), so request a
		// wide-enough raw batch to have a real chance of finding matches
		// beyond the most recent handful in one call.
		if (suggestions.length < 8) {
			const { page } = await paginateUsersFiltered(
				ctx,
				{ numItems: 300, cursor: null },
				(user) => !seen.has(user._id) && userMatchesSearch(user, q),
			);
			suggestions.push(...page.slice(0, 8 - suggestions.length));
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

		return await paginateSubscribers(ctx, args.paginationOpts, {
			search: search || undefined,
			status: args.status,
		});
	},
});

const giftStatusFilterValidator = v.union(
	v.literal("paid"),
	v.literal("redeemed"),
	v.literal("expired"),
	v.literal("refunded"),
	v.literal("pending_payment"),
);

/**
 * SST-9 gifting analytics, computed from the gift records themselves (which
 * are written only by payment webhooks / verified store purchases and by
 * redemption). "Purchased" = payment confirmed (anything past
 * pending_payment); "successful" = purchased and not refunded.
 */
export const giftInsights = query({
	args: {},
	handler: async (ctx) => {
		await requireAdmin(ctx);
		const now = Date.now();
		const gifts = await ctx.db.query("gifts").collect();

		const counts = {
			purchased: 0,
			successful: 0,
			redeemed: 0,
			unclaimed: 0,
			expired: 0,
			refunded: 0,
			checkoutsNotCompleted: 0,
		};
		const byProvider = { stripe: 0, app_store: 0, play_store: 0 };
		const revenue = new Map<string, number>();
		const purchasesByMonth = new Map<string, number>();
		const redemptionsByMonth = new Map<string, number>();
		const monthKey = (ms: number) => new Date(ms).toISOString().slice(0, 7);

		for (const gift of gifts) {
			const status = giftDisplayStatus(gift, now);
			if (status === "pending_payment") {
				counts.checkoutsNotCompleted += 1;
				continue;
			}
			counts.purchased += 1;
			if (gift.provider) byProvider[gift.provider] += 1;
			if (gift.paidAt) {
				const key = monthKey(gift.paidAt);
				purchasesByMonth.set(key, (purchasesByMonth.get(key) ?? 0) + 1);
			}
			if (gift.redeemedAt) {
				const key = monthKey(gift.redeemedAt);
				redemptionsByMonth.set(key, (redemptionsByMonth.get(key) ?? 0) + 1);
			}
			if (status === "refunded") {
				counts.refunded += 1;
				continue;
			}
			counts.successful += 1;
			if (status === "redeemed") counts.redeemed += 1;
			else if (status === "expired") counts.expired += 1;
			else counts.unclaimed += 1;
			if (gift.amountMinor !== undefined && gift.currency) {
				const currency = gift.currency.toLowerCase();
				revenue.set(currency, (revenue.get(currency) ?? 0) + gift.amountMinor);
			}
		}

		const lifetimeMembers = (await ctx.db.query("users").collect()).filter(
			(user) => user.lifetimeAccess,
		).length;

		const months = [
			...new Set([...purchasesByMonth.keys(), ...redemptionsByMonth.keys()]),
		]
			.sort()
			.slice(-12);

		return {
			...counts,
			redemptionRate:
				counts.successful > 0 ? counts.redeemed / counts.successful : 0,
			lifetimeMembers,
			byProvider,
			revenue: [...revenue.entries()]
				.map(([currency, amountMinor]) => ({ currency, amountMinor }))
				.sort((a, b) => b.amountMinor - a.amountMinor),
			monthly: months.map((month) => ({
				month,
				purchased: purchasesByMonth.get(month) ?? 0,
				redeemed: redemptionsByMonth.get(month) ?? 0,
			})),
		};
	},
});

/**
 * Paginated gift records for the admin Gifts page. `search` is an exact email
 * (purchaser or recipient); `status` filters by display status.
 */
export const listGifts = query({
	args: {
		paginationOpts: paginationOptsValidator,
		search: v.optional(v.string()),
		status: v.optional(giftStatusFilterValidator),
	},
	handler: async (ctx, args) => {
		await requireAdmin(ctx);
		const now = Date.now();
		const email = args.search ? normalizeEmail(args.search) : "";

		const result = await ctx.db
			.query("gifts")
			.order("desc")
			.filter((q) => {
				const conditions = [];
				if (email) {
					conditions.push(
						q.or(
							q.eq(q.field("recipientEmail"), email),
							q.eq(q.field("purchaserEmail"), email),
						),
					);
				}
				if (args.status === "expired") {
					conditions.push(
						q.and(
							q.eq(q.field("status"), "paid"),
							q.lte(q.field("expiresAt"), now),
						),
					);
				} else if (args.status === "paid") {
					conditions.push(
						q.and(
							q.eq(q.field("status"), "paid"),
							q.gt(q.field("expiresAt"), now),
						),
					);
				} else if (args.status) {
					conditions.push(q.eq(q.field("status"), args.status));
				}
				return conditions.length > 0 ? q.and(...conditions) : true;
			})
			.paginate(args.paginationOpts);

		return {
			...result,
			page: result.page.map((gift) => ({
				_id: gift._id,
				createdAt: gift.createdAt,
				paidAt: gift.paidAt ?? null,
				redeemedAt: gift.redeemedAt ?? null,
				expiresAt: gift.expiresAt ?? null,
				status: giftDisplayStatus(gift, now),
				provider: gift.provider ?? null,
				amountMinor: gift.amountMinor ?? null,
				currency: gift.currency ?? null,
				purchaserName: gift.purchaserName,
				purchaserEmail: gift.purchaserEmail,
				recipientName: gift.recipientName,
				recipientEmail: gift.recipientEmail,
			})),
		};
	},
});
