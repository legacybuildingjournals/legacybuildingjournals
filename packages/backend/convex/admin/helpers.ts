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
 * Cap on documents scanned per call. Without this, a sparse predicate (e.g.
 * "has billing history" when most users don't) makes the loop below keep
 * re-paginating the full `users` table within a single query execution,
 * which blows Convex's per-query document-read limit and surfaces as an
 * opaque "Server Error" on the client.
 */
const MAX_DOCS_SCANNED_PER_CALL = 512;

/** Cursor pagination with in-query filters (Convex-native continueCursor). */
export async function paginateUsersFiltered(
	ctx: QueryCtx,
	paginationOpts: PaginationOptions,
	matches: (user: Doc<"users">) => boolean,
): Promise<PaginationResult<AdminUserSummary>> {
	const targetCount = paginationOpts.numItems;
	const matched: Doc<"users">[] = [];
	let cursor = paginationOpts.cursor ?? null;
	let underlyingDone = false;
	let scanned = 0;

	while (
		matched.length < targetCount &&
		!underlyingDone &&
		scanned < MAX_DOCS_SCANNED_PER_CALL
	) {
		const batchSize = Math.min(
			Math.max((targetCount - matched.length) * 4, 25),
			MAX_DOCS_SCANNED_PER_CALL - scanned,
		);
		const batch = await ctx.db.query("users").order("desc").paginate({
			numItems: batchSize,
			cursor,
		});
		scanned += batch.page.length;

		for (const user of batch.page) {
			if (matches(user)) {
				matched.push(user);
				if (matched.length >= targetCount) break;
			}
		}

		underlyingDone = batch.isDone;
		cursor = batch.continueCursor;
		if (cursor === null) break;
	}

	const page = matched.slice(0, targetCount).map(toAdminUserSummary);
	// More to fetch whenever the underlying table isn't exhausted yet — even
	// if this call stopped early (scan cap) without filling a full page, so
	// the client's usePaginatedQuery keeps calling loadMore until it is.
	const hasMore = !underlyingDone && cursor !== null;

	return {
		page,
		isDone: !hasMore,
		continueCursor: hasMore && cursor !== null ? cursor : "",
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
