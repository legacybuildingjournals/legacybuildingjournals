import { api } from "@legacy-building/backend/convex/_generated/api";
import { Skeleton } from "@legacy-building/ui/components/skeleton";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import {
	BookOpen,
	CreditCard,
	FileText,
	LockOpen,
	Users,
	XCircle,
} from "lucide-react";

import { AdminStatCard } from "@/components/admin-stat-card";
import { adminContainerClass, adminStatCardClass } from "@/lib/admin-theme";

export const Route = createFileRoute("/_admin/dashboard")({
	component: DashboardPage,
});

function DashboardPage() {
	const insights = useQuery(api.admin.queries.platformInsights);

	return (
		<div className={adminContainerClass}>
			<header className="mb-6">
				<h1 className="font-heading font-semibold text-2xl tracking-tight">
					Platform insights
				</h1>
				<p className="mt-1 text-muted-foreground text-sm">
					Overview of users, content, and subscriptions.
				</p>
			</header>

			{insights === undefined ? (
				<DashboardInsightsSkeleton />
			) : (
				<div className="space-y-8">
					<section>
						<h2 className="mb-3 font-heading font-medium text-sm">Users</h2>
						<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
							<AdminStatCard
								label="Total users"
								value={insights.totalUsers}
								icon={Users}
							/>
							<AdminStatCard
								label="Active accounts"
								value={insights.activeAccounts}
							/>
							<AdminStatCard
								label="Suspended"
								value={insights.suspendedAccounts}
							/>
							<AdminStatCard label="Admins" value={insights.adminCount} />
						</div>
					</section>

					<section>
						<h2 className="mb-3 font-heading font-medium text-sm">
							Content & onboarding
						</h2>
						<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
							<AdminStatCard
								label="Journals"
								value={insights.totalJournals}
								icon={BookOpen}
							/>
							<AdminStatCard
								label="Journal entries"
								value={insights.totalEntries}
								icon={FileText}
							/>
							<AdminStatCard
								label="Welcome completed"
								value={insights.welcomeCompleted}
							/>
							<AdminStatCard
								label="Terms agreed"
								value={insights.termsAgreed}
							/>
						</div>
					</section>

					<section>
						<h2 className="mb-3 font-heading font-medium text-sm">
							Subscriptions
						</h2>
						<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
							<AdminStatCard
								label="Paid journal access"
								value={insights.subscriptionPaidAccess}
								icon={LockOpen}
							/>
							<AdminStatCard
								label="Active (paid)"
								value={insights.subscriptionActive}
								icon={CreditCard}
							/>
							<AdminStatCard
								label="Trialing"
								value={insights.subscriptionTrialing}
							/>
							<AdminStatCard
								label="Grace period"
								value={insights.subscriptionGracePeriod}
							/>
							<AdminStatCard
								label="Canceled"
								value={insights.subscriptionCanceled}
								icon={XCircle}
							/>
							<AdminStatCard
								label="Beta access"
								value={insights.subscriptionBeta}
							/>
							<AdminStatCard
								label="No subscription"
								value={insights.subscriptionNone}
							/>
							<AdminStatCard
								label="Status unset"
								value={insights.subscriptionUnset}
							/>
						</div>
					</section>
				</div>
			)}
		</div>
	);
}

function StatCardSkeleton({ showIcon = false }: { showIcon?: boolean }) {
	return (
		<div className={`${adminStatCardClass} p-5`}>
			<div className="flex items-start justify-between gap-3">
				<div className="flex-1 space-y-2">
					<Skeleton className="h-4 w-24" />
					<Skeleton className="h-8 w-16" />
				</div>
				{showIcon ? (
					<Skeleton className="size-10 shrink-0 rounded-full" />
				) : null}
			</div>
		</div>
	);
}

function DashboardInsightsSkeleton() {
	return (
		<div
			className="min-h-[50svh] space-y-8"
			role="status"
			aria-busy="true"
			aria-label="Loading platform insights"
		>
			<section>
				<Skeleton className="mb-3 h-4 w-16" />
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
					<StatCardSkeleton showIcon />
					<StatCardSkeleton />
					<StatCardSkeleton />
					<StatCardSkeleton />
				</div>
			</section>

			<section>
				<Skeleton className="mb-3 h-4 w-40" />
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
					<StatCardSkeleton showIcon />
					<StatCardSkeleton showIcon />
					<StatCardSkeleton />
					<StatCardSkeleton />
				</div>
			</section>

			<section>
				<Skeleton className="mb-3 h-4 w-28" />
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
					<StatCardSkeleton showIcon />
					<StatCardSkeleton showIcon />
					<StatCardSkeleton />
					<StatCardSkeleton />
					<StatCardSkeleton />
					<StatCardSkeleton />
					<StatCardSkeleton />
				</div>
			</section>
		</div>
	);
}
