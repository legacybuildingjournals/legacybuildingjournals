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

export function buildSubscriberPredicate(args: {
	search?: string;
	status?: Exclude<SubscriptionStatusFilter, "unset" | "none">;
}) {
	return (user: Doc<"users">) => {
		const sub = user.subscriptionStatus;
		if (!sub || sub === "none") return false;
		if (args.status && sub !== args.status) return false;
		if (args.search && !userMatchesSearch(user, args.search)) return false;
		return true;
	};
}

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

	while (matched.length < targetCount && !underlyingDone) {
		const batchSize = Math.max((targetCount - matched.length) * 4, 25);
		const batch = await ctx.db.query("users").order("desc").paginate({
			numItems: batchSize,
			cursor,
		});

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
	const hasMore =
		matched.length >= targetCount && cursor !== null && !underlyingDone;

	return {
		page,
		isDone: !hasMore,
		continueCursor: hasMore && cursor !== null ? cursor : "",
	};
}
