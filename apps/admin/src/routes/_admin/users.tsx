import { api } from "@legacy-building/backend/convex/_generated/api";
import type { Id } from "@legacy-building/backend/convex/_generated/dataModel";
import { Button } from "@legacy-building/ui/components/button";
import { createFileRoute } from "@tanstack/react-router";
import { usePaginatedQuery } from "convex/react";
import { useState } from "react";

import { AdminTablePagination } from "@/components/admin-table-pagination";
import { PaginatedTableFrame } from "@/components/paginated-table-frame";
import { UserDetailDialog } from "@/components/user-detail-dialog";
import { UsersSearchField } from "@/components/users-search-field";
import { UsersTable } from "@/components/users-table";
import { usePaginatedPage } from "@/hooks/use-paginated-page";
import { adminContainerClass } from "@/lib/admin-theme";
import { ADMIN_PAGE_SIZE } from "@/lib/pagination";

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
		| ""
		| "active"
		| "trialing"
		| "grace_period"
		| "canceled"
		| "none"
		| "unset"
		| "beta"
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
				<select
					value={roleFilter}
					onChange={(e) => {
						setRoleFilter(e.target.value as "" | "admin" | "user");
						resetPage();
					}}
					className="h-11 rounded-xl border border-border bg-card px-3 text-sm"
					aria-label="Filter by role"
				>
					<option value="">All roles</option>
					<option value="admin">Admin</option>
					<option value="user">User</option>
				</select>
				<select
					value={statusFilter}
					onChange={(e) => {
						setStatusFilter(e.target.value as "" | "active" | "suspended");
						resetPage();
					}}
					className="h-11 rounded-xl border border-border bg-card px-3 text-sm"
					aria-label="Filter by account status"
				>
					<option value="">All statuses</option>
					<option value="active">Active</option>
					<option value="suspended">Suspended</option>
				</select>
				<select
					value={subscriptionFilter}
					onChange={(e) => {
						setSubscriptionFilter(
							e.target.value as
								| ""
								| "active"
								| "trialing"
								| "grace_period"
								| "canceled"
								| "none"
								| "unset"
								| "beta",
						);
						resetPage();
					}}
					className="h-11 rounded-xl border border-border bg-card px-3 text-sm"
					aria-label="Filter by subscription status"
				>
					<option value="">All subscriptions</option>
					<option value="active">Active (paid)</option>
					<option value="trialing">Trialing</option>
					<option value="grace_period">Grace period</option>
					<option value="canceled">Canceled</option>
					<option value="beta">Beta</option>
					<option value="none">None</option>
					<option value="unset">Not set</option>
				</select>
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
