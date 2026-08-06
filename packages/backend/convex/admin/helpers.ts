import type { PaginationOptions, PaginationResult } from "convex/server";
import { ConvexError } from "convex/values";

import type { Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { mirroredPaidJournalAccess } from "./billing";

export type AccountStatus = "active" | "suspended";

export type SubscriptionStatusFilter =
	| "active"
	| "trialing"
	| "grace_period"
	| "canceled"
	| "none"
	| "unset"
	| "beta";

export type AdminUserSummary = ReturnType<typeof toAdminUserSummary>;

export function effectiveAccountStatus(
	user: Pick<Doc<"users">, "accountStatus">,
): AccountStatus {
	return user.accountStatus ?? "active";
}

export async function requireAdmin(ctx: QueryCtx | MutationCtx) {
	const identity = await ctx.auth.getUserIdentity();
	if (!identity) {
		throw new ConvexError({
			code: "UNAUTHENTICATED",
			message: "You must be signed in.",
		});
	}

	const adminUser = await ctx.db
		.query("users")
		.withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
		.unique();

	if (adminUser?.role !== "admin") {
		throw new ConvexError({
			code: "FORBIDDEN",
			message: "Admin access required.",
		});
	}

	return adminUser;
}

export function toAdminUserSummary(user: Doc<"users">) {
	return {
		_id: user._id,
		clerkId: user.clerkId,
		email: user.email,
		name: user.name,
		role: user.role,
		accountStatus: effectiveAccountStatus(user),
		subscriptionStatus: user.subscriptionStatus ?? null,
		betaAccess: user.betaAccess === true,
		hasPaidJournalAccess: mirroredPaidJournalAccess(user),
		welcomeCompletedAt: user.welcomeCompletedAt ?? null,
		agreedToTermsAt: user.agreedToTermsAt ?? null,
	};
}

export function normalizeSearchQuery(query: string) {
	return query.trim().toLowerCase();
}

export function userMatchesSearch(
	user: Pick<Doc<"users">, "email" | "name">,
	search: string,
) {
	const q = normalizeSearchQuery(search);
	if (!q) return true;
	return (
		user.email.toLowerCase().includes(q) || user.name.toLowerCase().includes(q)
	);
}

export function buildUserListPredicate(args: {
	search?: string;
	accountStatus?: AccountStatus;
	role?: "admin" | "user";
	subscriptionStatus?: SubscriptionStatusFilter;
}) {
	return (user: Doc<"users">) => {
		if (args.search && !userMatchesSearch(user, args.search)) return false;
		if (
			args.accountStatus &&
			effectiveAccountStatus(user) !== args.accountStatus
		) {
			return false;
		}
		if (args.role && user.role !== args.role) return false;
		if (args.subscriptionStatus) {
			if (args.subscriptionStatus === "beta") {
				if (user.betaAccess !== true) return false;
			} else {
				const sub = user.subscriptionStatus;
				if (
					args.subscriptionStatus === "none" ||
					args.subscriptionStatus === "unset"
				) {
					if (sub !== "none" && sub !== undefined) return false;
				} else if (sub !== args.subscriptionStatus) {
					return false;
				}
			}
		}
		return true;
	};
}

/**
 * Cursor pagination with in-query filters (Convex-native continueCursor).
 *
 * Convex allows exactly one `.paginate()` call per function execution — an
 * earlier version of this looped, re-paginating within the same call
 * whenever a sparse predicate under-filled a page, which crashes with "ran
 * multiple paginated queries" the moment that happens. So this reads exactly
 * one underlying page and filters it, even if that leaves the returned page
 * short of `numItems` (or empty). The client already re-invokes this (a
 * fresh execution, a fresh single `paginate()` call) via `loadMore` while
 * status is "CanLoadMore", so sparse matches still surface after enough
 * round trips — just as a plain unfiltered search would take one round trip
 * per page.
 */
export async function paginateUsersFiltered(
	ctx: QueryCtx,
	paginationOpts: PaginationOptions,
	matches: (user: Doc<"users">) => boolean,
): Promise<PaginationResult<AdminUserSummary>> {
	const batch = await ctx.db
		.query("users")
		.order("desc")
		.paginate(paginationOpts);

	return {
		...batch,
		page: batch.page.filter(matches).map(toAdminUserSummary),
	};
}

const SUBSCRIBER_STATUSES = [
	"active",
	"trialing",
	"grace_period",
	"canceled",
] as const satisfies readonly Exclude<
	SubscriptionStatusFilter,
	"unset" | "none" | "beta"
>[];

/** Hard cap on total subscriber rows read across all statuses in one call. */
const MAX_SUBSCRIBERS_READ = 4000;

/**
 * Subscribers ("has billing history") are a small slice of `users` — most
 * users have no subscription at all. Filtering the whole table in memory
 * (as `paginateUsersFiltered` does) means reading thousands of non-matching
 * rows to find a handful of matches, which blows Convex's per-query
 * document-read budget and surfaces as an opaque "Server Error".
 *
 * Instead, use the `by_subscription_status` index to read only rows that
 * already match — at most one indexed query per status (1 or 4), each
 * bounded by MAX_SUBSCRIBERS_READ. Merge, sort, apply search, then paginate
 * in memory with a simple offset cursor (safe because the merged set is
 * bounded, unlike the full `users` table).
 */
export async function paginateSubscribers(
	ctx: QueryCtx,
	paginationOpts: PaginationOptions,
	args: {
		search?: string;
		status?: Exclude<SubscriptionStatusFilter, "unset" | "none" | "beta">;
	},
): Promise<PaginationResult<AdminUserSummary>> {
	const statuses = args.status ? [args.status] : SUBSCRIBER_STATUSES;
	const perStatusCap = Math.ceil(MAX_SUBSCRIBERS_READ / statuses.length);

	const rows: Doc<"users">[] = [];
	for (const status of statuses) {
		const batch = await ctx.db
			.query("users")
			.withIndex("by_subscription_status", (q) =>
				q.eq("subscriptionStatus", status),
			)
			.order("desc")
			.take(perStatusCap);
		rows.push(...batch);
	}
	rows.sort((a, b) => b._creationTime - a._creationTime);

	const filtered = args.search
		? rows.filter((user) => userMatchesSearch(user, args.search as string))
		: rows;

	const targetCount = paginationOpts.numItems;
	const start = paginationOpts.cursor ? Number(paginationOpts.cursor) : 0;
	const pageRows = filtered.slice(start, start + targetCount);
	const nextStart = start + pageRows.length;
	const isDone = nextStart >= filtered.length;

	return {
		page: pageRows.map(toAdminUserSummary),
		isDone,
		continueCursor: isDone ? "" : String(nextStart),
	};
}
