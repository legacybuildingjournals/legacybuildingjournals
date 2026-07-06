import { api } from "@legacy-building/backend/convex/_generated/api";
import type { Id } from "@legacy-building/backend/convex/_generated/dataModel";
import { Button } from "@legacy-building/ui/components/button";
import { Input } from "@legacy-building/ui/components/input";
import { PageLoader } from "@legacy-building/ui/components/page-loader";
import { createFileRoute } from "@tanstack/react-router";
import { usePaginatedQuery } from "convex/react";
import { Search } from "lucide-react";
import { useState } from "react";

import { AdminFilterSelect } from "@/components/admin-filter-select";

import { AdminTablePagination } from "@/components/admin-table-pagination";
import { PaginatedTableFrame } from "@/components/paginated-table-frame";
import {
	PaidAccessBadge,
	SubscriptionStatusBadge,
} from "@/components/subscription-status-badge";
import { UserDetailDialog } from "@/components/user-detail-dialog";
import { usePaginatedPage } from "@/hooks/use-paginated-page";
import {
	adminCardClass,
	adminContainerClass,
	adminTableCellMutedClass,
	adminTableCellPrimaryClass,
	adminTableHeadCellClass,
	adminTableHeadRowClass,
	adminTableRowClass,
} from "@/lib/admin-theme";
import { ADMIN_PAGE_SIZE } from "@/lib/pagination";

const STATUS_FILTER_ITEMS = [
	{ label: "All billing users", value: "all" },
	{ label: "Active (paid)", value: "active" },
	{ label: "Trialing", value: "trialing" },
	{ label: "Grace period", value: "grace_period" },
	{ label: "Canceled", value: "canceled" },
] as const;

type StatusFilterValue = (typeof STATUS_FILTER_ITEMS)[number]["value"];

export const Route = createFileRoute("/_admin/subscriptions")({
	component: SubscriptionsPage,
});

function SubscriptionsPage() {
	const [search, setSearch] = useState("");
	const [searchInput, setSearchInput] = useState("");
	const [statusFilter, setStatusFilter] = useState<
		"" | "active" | "trialing" | "grace_period" | "canceled"
	>("");
	const [selectedUserId, setSelectedUserId] = useState<Id<"users"> | null>(
		null,
	);

	const { results, status, loadMore } = usePaginatedQuery(
		api.admin.queries.listSubscribers,
		{
			search: search || undefined,
			status: statusFilter || undefined,
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

	const applySearch = () => {
		setSearch(searchInput.trim());
		resetPage();
	};
	const isLoadingFirstPage = status === "LoadingFirstPage";

	return (
		<div className={adminContainerClass}>
			<header className="mb-6">
				<h1 className="font-heading font-semibold text-2xl tracking-tight">
					Subscriptions
				</h1>
				<p className="mt-1 text-muted-foreground text-sm">
					All users with billing activity — trialing, active, grace period, or
					canceled (read-only).
				</p>
			</header>

			<div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
				<div className="relative min-w-[200px] flex-1">
					<Search
						className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
						aria-hidden
					/>
					<Input
						placeholder="Search by name or email"
						value={searchInput}
						onChange={(e) => setSearchInput(e.target.value)}
						onKeyDown={(e) => e.key === "Enter" && applySearch()}
						className="h-11 rounded-xl pl-9"
					/>
				</div>
				<Button
					type="button"
					className="h-11 rounded-xl bg-[#008080] text-white hover:bg-[#006b6b]"
					onClick={applySearch}
				>
					Search
				</Button>
				<AdminFilterSelect
					items={STATUS_FILTER_ITEMS}
					value={statusFilter || "all"}
					onValueChange={(value) => {
						setStatusFilter(
							value === "all"
								? ""
								: (value as Exclude<StatusFilterValue, "all">),
						);
						resetPage();
					}}
					ariaLabel="Filter by subscription status"
					className="min-w-[220px]"
				/>
			</div>

			{isLoadingFirstPage ? (
				<div className={adminCardClass}>
					<PageLoader overlay={false} className="min-h-[50svh]" />
				</div>
			) : (
				<PaginatedTableFrame
					pageIndex={pageIndex}
					isTransitioning={isPageTransitioning}
				>
					<div className={`${adminCardClass} overflow-hidden`}>
						{pageItems.length === 0 ? (
							<p className="p-8 text-center text-muted-foreground text-sm">
								No users with billing history match your filters.
							</p>
						) : (
							<div className="overflow-x-auto">
								<table className="w-full min-w-[720px] text-left text-sm">
									<thead>
										<tr className={adminTableHeadRowClass}>
											<th className={adminTableHeadCellClass}>Name</th>
											<th className={adminTableHeadCellClass}>Email</th>
											<th className={adminTableHeadCellClass}>Status</th>
											<th className={adminTableHeadCellClass}>
												Journal access
											</th>
										</tr>
									</thead>
									<tbody>
										{pageItems.map((user) => (
											<tr
												key={user._id}
												className={adminTableRowClass}
												onClick={() => setSelectedUserId(user._id)}
												onKeyDown={(e) => {
													if (e.key === "Enter" || e.key === " ") {
														e.preventDefault();
														setSelectedUserId(user._id);
													}
												}}
												tabIndex={0}
											>
												<td className={adminTableCellPrimaryClass}>
													{user.name || "—"}
												</td>
												<td className={adminTableCellMutedClass}>
													{user.email}
												</td>
												<td className="px-4 py-3">
													<SubscriptionStatusBadge
														status={user.subscriptionStatus}
														betaAccess={user.betaAccess}
													/>
												</td>
												<td className="px-4 py-3">
													<PaidAccessBadge
														hasAccess={user.hasPaidJournalAccess}
													/>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						)}
					</div>
				</PaginatedTableFrame>
			)}

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
