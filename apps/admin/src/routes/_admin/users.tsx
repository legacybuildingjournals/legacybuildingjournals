import { api } from "@legacy-building/backend/convex/_generated/api";
import type { Id } from "@legacy-building/backend/convex/_generated/dataModel";
import { Button } from "@legacy-building/ui/components/button";
import { createFileRoute } from "@tanstack/react-router";
import { usePaginatedQuery } from "convex/react";
import { useState } from "react";

import { AdminFilterSelect } from "@/components/admin-filter-select";

import { AdminTablePagination } from "@/components/admin-table-pagination";
import { PaginatedTableFrame } from "@/components/paginated-table-frame";
import { UserDetailDialog } from "@/components/user-detail-dialog";
import { UsersSearchField } from "@/components/users-search-field";
import { UsersTable } from "@/components/users-table";
import { usePaginatedPage } from "@/hooks/use-paginated-page";
import { adminContainerClass } from "@/lib/admin-theme";
import { ADMIN_PAGE_SIZE } from "@/lib/pagination";

const ROLE_FILTER_ITEMS = [
	{ label: "All roles", value: "all" },
	{ label: "Admin", value: "admin" },
	{ label: "User", value: "user" },
] as const;

const ACCOUNT_STATUS_FILTER_ITEMS = [
	{ label: "All statuses", value: "all" },
	{ label: "Active", value: "active" },
	{ label: "Suspended", value: "suspended" },
] as const;

const SUBSCRIPTION_FILTER_ITEMS = [
	{ label: "All subscriptions", value: "all" },
	{ label: "Active (paid)", value: "active" },
	{ label: "Trialing", value: "trialing" },
	{ label: "Grace period", value: "grace_period" },
	{ label: "Canceled", value: "canceled" },
	{ label: "Beta", value: "beta" },
	{ label: "None", value: "none" },
] as const;

type RoleFilterValue = (typeof ROLE_FILTER_ITEMS)[number]["value"];
type AccountStatusFilterValue =
	(typeof ACCOUNT_STATUS_FILTER_ITEMS)[number]["value"];
type SubscriptionFilterValue =
	(typeof SUBSCRIPTION_FILTER_ITEMS)[number]["value"];

export const Route = createFileRoute("/_admin/users")({
	component: UsersPage,
});

function UsersPage() {
	const [searchInput, setSearchInput] = useState("");
	const [search, setSearch] = useState("");
	const [roleFilter, setRoleFilter] = useState<"" | "admin" | "user">("");
	const [statusFilter, setStatusFilter] = useState<"" | "active" | "suspended">(
		"",
	);
	const [subscriptionFilter, setSubscriptionFilter] = useState<
		"" | "active" | "trialing" | "grace_period" | "canceled" | "none" | "beta"
	>("");
	const [selectedUserId, setSelectedUserId] = useState<Id<"users"> | null>(
		null,
	);

	const { results, status, loadMore } = usePaginatedQuery(
		api.admin.queries.listUsers,
		{
			search: search || undefined,
			role: roleFilter || undefined,
			accountStatus: statusFilter || undefined,
			subscriptionStatus: subscriptionFilter || undefined,
		},
		{ initialNumItems: ADMIN_PAGE_SIZE },
	);

	const {
		pageIndex,
		pageItems,
		hasPrevPage,
		hasNextPage,
		rangeLabel,
		totalPages,
		isPageTransitioning,
		resetPage,
		goToPrev,
		goToNext,
	} = usePaginatedPage(results, status, loadMore);

	const isLoadingFirstPage = status === "LoadingFirstPage";

	const applySearch = (value: string) => {
		setSearch(value.trim());
		resetPage();
	};

	return (
		<div className={adminContainerClass}>
			<header className="mb-6">
				<h1 className="font-heading font-semibold text-2xl tracking-tight">
					User management
				</h1>
				<p className="mt-1 text-muted-foreground text-sm">
					Search, filter, and manage accounts.
				</p>
			</header>

			<div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
				<UsersSearchField
					value={searchInput}
					onChange={setSearchInput}
					onSubmit={applySearch}
				/>
				<Button
					type="button"
					className="h-11 shrink-0 rounded-xl bg-[#008080] px-5 text-white hover:bg-[#006b6b]"
					onClick={() => applySearch(searchInput)}
				>
					Search
				</Button>
				<AdminFilterSelect
					items={ROLE_FILTER_ITEMS}
					value={roleFilter || "all"}
					onValueChange={(value) => {
						setRoleFilter(
							value === "all" ? "" : (value as Exclude<RoleFilterValue, "all">),
						);
						resetPage();
					}}
					ariaLabel="Filter by role"
				/>
				<AdminFilterSelect
					items={ACCOUNT_STATUS_FILTER_ITEMS}
					value={statusFilter || "all"}
					onValueChange={(value) => {
						setStatusFilter(
							value === "all"
								? ""
								: (value as Exclude<AccountStatusFilterValue, "all">),
						);
						resetPage();
					}}
					ariaLabel="Filter by account status"
				/>
				<AdminFilterSelect
					items={SUBSCRIPTION_FILTER_ITEMS}
					value={subscriptionFilter || "all"}
					onValueChange={(value) => {
						setSubscriptionFilter(
							value === "all"
								? ""
								: (value as Exclude<SubscriptionFilterValue, "all">),
						);
						resetPage();
					}}
					ariaLabel="Filter by subscription status"
					className="min-w-[220px]"
				/>
			</div>

			<PaginatedTableFrame
				pageIndex={pageIndex}
				isTransitioning={isPageTransitioning}
			>
				<UsersTable
					users={pageItems}
					isLoading={isLoadingFirstPage}
					onSelectUser={setSelectedUserId}
				/>
			</PaginatedTableFrame>

			{!isLoadingFirstPage && pageItems.length === 0 ? (
				<p className="mt-4 text-center text-muted-foreground text-sm">
					No users found
					{search ? ` matching “${search}”` : ""}.
				</p>
			) : null}

			{!isLoadingFirstPage && (pageItems.length > 0 || hasPrevPage) ? (
				<AdminTablePagination
					pageIndex={pageIndex}
					hasPrevPage={hasPrevPage}
					hasNextPage={hasNextPage}
					rangeLabel={rangeLabel}
					totalPages={totalPages}
					isPageTransitioning={isPageTransitioning}
					onPrev={goToPrev}
					onNext={goToNext}
				/>
			) : null}

			<UserDetailDialog
				userId={selectedUserId}
				open={selectedUserId !== null}
				onOpenChange={(open) => {
					if (!open) setSelectedUserId(null);
				}}
			/>
		</div>
	);
}
