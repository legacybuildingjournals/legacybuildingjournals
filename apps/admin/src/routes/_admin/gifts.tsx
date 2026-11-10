import { api } from "@legacy-building/backend/convex/_generated/api";
import { Button } from "@legacy-building/ui/components/button";
import { Input } from "@legacy-building/ui/components/input";
import { PageLoader } from "@legacy-building/ui/components/page-loader";
import { Skeleton } from "@legacy-building/ui/components/skeleton";
import { cn } from "@legacy-building/ui/lib/utils";
import { createFileRoute } from "@tanstack/react-router";
import { usePaginatedQuery, useQuery } from "convex/react";
import {
	CheckCircle2,
	Gift,
	Infinity as InfinityIcon,
	RotateCcw,
	Search,
} from "lucide-react";
import { useState } from "react";

import { AdminFilterSelect } from "@/components/admin-filter-select";
import { AdminStatCard } from "@/components/admin-stat-card";
import { AdminTablePagination } from "@/components/admin-table-pagination";
import { PaginatedTableFrame } from "@/components/paginated-table-frame";
import { usePaginatedPage } from "@/hooks/use-paginated-page";
import {
	adminCardClass,
	adminContainerClass,
	adminStatCardClass,
	adminTableCellMutedClass,
	adminTableCellPrimaryClass,
	adminTableHeadCellClass,
	adminTableHeadRowClass,
} from "@/lib/admin-theme";
import { ADMIN_PAGE_SIZE } from "@/lib/pagination";

export const Route = createFileRoute("/_admin/gifts")({
	component: GiftsPage,
});

const STATUS_FILTER_ITEMS = [
	{ label: "All gifts", value: "all" },
	{ label: "Not claimed yet", value: "paid" },
	{ label: "Redeemed", value: "redeemed" },
	{ label: "Expired", value: "expired" },
	{ label: "Refunded", value: "refunded" },
	{ label: "Checkout not completed", value: "pending_payment" },
] as const;

type StatusFilterValue = (typeof STATUS_FILTER_ITEMS)[number]["value"];
type GiftStatus = Exclude<StatusFilterValue, "all">;

const STATUS_LABEL: Record<GiftStatus, string> = {
	paid: "Not claimed",
	redeemed: "Redeemed",
	expired: "Expired",
	refunded: "Refunded",
	pending_payment: "Checkout open",
};

const STATUS_STYLE: Record<GiftStatus, string> = {
	paid: "bg-[#ebf6f6] text-[#008080] dark:bg-primary/20 dark:text-primary",
	redeemed:
		"bg-green-50 text-green-800 dark:bg-green-500/15 dark:text-green-300",
	expired: "bg-muted text-muted-foreground",
	refunded: "bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300",
	pending_payment: "bg-muted text-muted-foreground",
};

const PROVIDER_LABEL = {
	stripe: "Web (Stripe)",
	app_store: "App Store",
	play_store: "Google Play",
} as const;

type Provider = keyof typeof PROVIDER_LABEL;
const PROVIDERS = Object.keys(PROVIDER_LABEL) as Provider[];

function formatMoney(amountMinor: number, currency: string) {
	try {
		return new Intl.NumberFormat(undefined, {
			style: "currency",
			currency: currency.toUpperCase(),
		}).format(amountMinor / 100);
	} catch {
		return `${(amountMinor / 100).toFixed(2)} ${currency.toUpperCase()}`;
	}
}

function formatDate(ms: number | null) {
	if (!ms) return "—";
	return new Date(ms).toLocaleDateString(undefined, {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
}

/** SST-9: gifting activity, computed from real payment + redemption records. */
function GiftsPage() {
	const insights = useQuery(api.admin.queries.giftInsights);

	return (
		<div className={adminContainerClass}>
			<header className="mb-6">
				<h1 className="font-heading font-semibold text-2xl tracking-tight">
					Gifts
				</h1>
				<p className="mt-1 text-muted-foreground text-sm">
					Lifetime access gifts: purchases, redemptions and revenue (read-only).
				</p>
			</header>

			{insights === undefined ? (
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
					{["a", "b", "c", "d", "e", "f", "g", "h"].map((key) => (
						<Skeleton
							key={key}
							className={cn(adminStatCardClass, "h-[104px]")}
						/>
					))}
				</div>
			) : (
				<div className="space-y-8">
					<section>
						<h2 className="mb-3 font-heading font-medium text-sm">
							Purchases &amp; redemptions
						</h2>
						<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
							<AdminStatCard
								label="Gifts purchased"
								value={insights.purchased}
								icon={Gift}
							/>
							<AdminStatCard
								label="Successful (not refunded)"
								value={insights.successful}
								icon={CheckCircle2}
							/>
							<AdminStatCard
								label="Redeemed"
								value={insights.redeemed}
								icon={InfinityIcon}
							/>
							<AdminStatCard
								label="Redemption rate"
								value={`${Math.round(insights.redemptionRate * 100)}%`}
							/>
							<AdminStatCard
								label="Not claimed yet"
								value={insights.unclaimed}
							/>
							<AdminStatCard label="Expired" value={insights.expired} />
							<AdminStatCard
								label="Refunded"
								value={insights.refunded}
								icon={RotateCcw}
							/>
							<AdminStatCard
								label="Lifetime members"
								value={insights.lifetimeMembers}
							/>
						</div>
					</section>

					<section className="grid gap-4 lg:grid-cols-3">
						<div className={cn(adminCardClass, "p-5")}>
							<h2 className="font-heading font-medium text-sm">Revenue</h2>
							<p className="mt-1 text-muted-foreground text-xs">
								Successful gifts, in the currency charged.
							</p>
							{insights.revenue.length === 0 ? (
								<p className="mt-4 text-muted-foreground text-sm">
									No revenue yet.
								</p>
							) : (
								<ul className="mt-4 space-y-2">
									{insights.revenue.map((row) => (
										<li
											key={row.currency}
											className="flex items-center justify-between font-medium text-sm"
										>
											<span className="text-muted-foreground uppercase">
												{row.currency}
											</span>
											<span>{formatMoney(row.amountMinor, row.currency)}</span>
										</li>
									))}
								</ul>
							)}
						</div>

						<div className={cn(adminCardClass, "p-5")}>
							<h2 className="font-heading font-medium text-sm">
								Purchases by platform
							</h2>
							<ul className="mt-4 space-y-2">
								{PROVIDERS.map((provider) => (
									<li
										key={provider}
										className="flex items-center justify-between text-sm"
									>
										<span className="text-muted-foreground">
											{PROVIDER_LABEL[provider]}
										</span>
										<span className="font-medium">
											{insights.byProvider[provider]}
										</span>
									</li>
								))}
								<li className="flex items-center justify-between border-border border-t pt-2 text-sm">
									<span className="text-muted-foreground">
										Checkouts not completed
									</span>
									<span className="font-medium">
										{insights.checkoutsNotCompleted}
									</span>
								</li>
							</ul>
						</div>

						<div className={cn(adminCardClass, "p-5")}>
							<h2 className="font-heading font-medium text-sm">
								Last 12 months
							</h2>
							{insights.monthly.length === 0 ? (
								<p className="mt-4 text-muted-foreground text-sm">
									No gifting activity yet.
								</p>
							) : (
								<table className="mt-3 w-full text-sm">
									<thead>
										<tr className="text-muted-foreground text-xs">
											<th className="pb-2 text-left font-medium">Month</th>
											<th className="pb-2 text-right font-medium">Purchased</th>
											<th className="pb-2 text-right font-medium">Redeemed</th>
										</tr>
									</thead>
									<tbody>
										{insights.monthly.map((row) => (
											<tr key={row.month}>
												<td className="py-1">{row.month}</td>
												<td className="py-1 text-right">{row.purchased}</td>
												<td className="py-1 text-right">{row.redeemed}</td>
											</tr>
										))}
									</tbody>
								</table>
							)}
						</div>
					</section>
				</div>
			)}

			<GiftsTable />
		</div>
	);
}

function GiftsTable() {
	const [searchInput, setSearchInput] = useState("");
	const [search, setSearch] = useState("");
	const [statusFilter, setStatusFilter] = useState<StatusFilterValue>("all");

	const { results, status, loadMore } = usePaginatedQuery(
		api.admin.queries.listGifts,
		{
			search: search || undefined,
			status: statusFilter === "all" ? undefined : statusFilter,
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
		<section className="mt-8">
			<h2 className="mb-3 font-heading font-medium text-sm">All gifts</h2>
			<div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
				<div className="relative min-w-[200px] flex-1">
					<Search
						className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
						aria-hidden
					/>
					<Input
						placeholder="Exact purchaser or recipient email"
						value={searchInput}
						onChange={(event) => setSearchInput(event.target.value)}
						onKeyDown={(event) => event.key === "Enter" && applySearch()}
						className="h-11 rounded-xl pl-9"
						aria-label="Search gifts by email"
					/>
				</div>
				<Button
					type="button"
					className="h-11 rounded-xl bg-[#008080] text-white transition-colors hover:bg-[#006b6b] active:scale-[0.98]"
					onClick={applySearch}
				>
					Search
				</Button>
				<AdminFilterSelect
					items={STATUS_FILTER_ITEMS}
					value={statusFilter}
					onValueChange={(value) => {
						setStatusFilter(value);
						resetPage();
					}}
					ariaLabel="Filter gifts by status"
					className="min-w-[220px]"
				/>
			</div>

			{isLoadingFirstPage ? (
				<div className={adminCardClass}>
					<PageLoader overlay={false} className="min-h-[30svh]" />
				</div>
			) : (
				<PaginatedTableFrame
					pageIndex={pageIndex}
					isTransitioning={isPageTransitioning}
				>
					<div className={`${adminCardClass} overflow-hidden`}>
						{pageItems.length === 0 ? (
							<div className="flex flex-col items-center gap-2 p-8 text-center">
								<Gift className="size-8 text-muted-foreground" aria-hidden />
								<p className="font-medium text-sm">No gifts found</p>
								<p className="text-muted-foreground text-sm">
									Gifts appear here once a purchase is confirmed.
								</p>
							</div>
						) : (
							<div className="overflow-x-auto">
								<table className="w-full min-w-[860px] text-left text-sm">
									<thead>
										<tr className={adminTableHeadRowClass}>
											<th className={adminTableHeadCellClass}>Purchased</th>
											<th className={adminTableHeadCellClass}>Purchaser</th>
											<th className={adminTableHeadCellClass}>Recipient</th>
											<th className={adminTableHeadCellClass}>Platform</th>
											<th className={adminTableHeadCellClass}>Amount</th>
											<th className={adminTableHeadCellClass}>Status</th>
											<th className={adminTableHeadCellClass}>Redeemed</th>
										</tr>
									</thead>
									<tbody>
										{pageItems.map((gift) => (
											<tr
												key={gift._id}
												className="border-border border-b last:border-b-0"
											>
												<td className={adminTableCellMutedClass}>
													{formatDate(gift.paidAt ?? gift.createdAt)}
												</td>
												<td className={adminTableCellPrimaryClass}>
													<div>{gift.purchaserName || "—"}</div>
													<div className="font-normal text-muted-foreground text-xs">
														{gift.purchaserEmail || "—"}
													</div>
												</td>
												<td className={adminTableCellPrimaryClass}>
													<div>{gift.recipientName || "—"}</div>
													<div className="font-normal text-muted-foreground text-xs">
														{gift.recipientEmail || "—"}
													</div>
												</td>
												<td className={adminTableCellMutedClass}>
													{gift.provider ? PROVIDER_LABEL[gift.provider] : "—"}
												</td>
												<td className={adminTableCellMutedClass}>
													{gift.amountMinor !== null && gift.currency
														? formatMoney(gift.amountMinor, gift.currency)
														: "—"}
												</td>
												<td className="px-4 py-3">
													<span
														className={cn(
															"inline-flex rounded-full px-2.5 py-0.5 font-medium text-xs",
															STATUS_STYLE[gift.status],
														)}
													>
														{STATUS_LABEL[gift.status]}
													</span>
												</td>
												<td className={adminTableCellMutedClass}>
													{formatDate(gift.redeemedAt)}
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
		</section>
	);
}
