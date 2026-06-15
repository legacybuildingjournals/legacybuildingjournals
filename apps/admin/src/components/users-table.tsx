import type { Id } from "@legacy-building/backend/convex/_generated/dataModel";
import { Skeleton } from "@legacy-building/ui/components/skeleton";
import { cn } from "@legacy-building/ui/lib/utils";

import {
	AccountStatusBadge,
	PaidAccessBadge,
	RoleBadge,
	SubscriptionStatusBadge,
} from "@/components/subscription-status-badge";
import {
	adminCardClass,
	adminTableCellMutedClass,
	adminTableCellPrimaryClass,
	adminTableHeadCellClass,
	adminTableHeadRowClass,
	adminTableRowClass,
} from "@/lib/admin-theme";

export type AdminUserRow = {
	_id: Id<"users">;
	email: string;
	name: string;
	role: "admin" | "user";
	accountStatus: "active" | "suspended";
	subscriptionStatus:
		| "active"
		| "trialing"
		| "grace_period"
		| "canceled"
		| "none"
		| null;
	betaAccess: boolean;
	hasPaidJournalAccess: boolean;
};

type UsersTableProps = {
	users: AdminUserRow[];
	isLoading?: boolean;
	onSelectUser: (userId: Id<"users">) => void;
};

const USERS_TABLE_SKELETON_ROWS = [
	"skeleton-row-a",
	"skeleton-row-b",
	"skeleton-row-c",
	"skeleton-row-d",
	"skeleton-row-e",
] as const;

export function UsersTable({
	users,
	isLoading,
	onSelectUser,
}: UsersTableProps) {
	if (isLoading) {
		return (
			<div
				className={cn(adminCardClass, "overflow-hidden")}
				role="status"
				aria-busy="true"
				aria-label="Loading users"
			>
				<div className="overflow-x-auto">
					<table className="w-full min-w-[760px] text-left text-sm">
						<thead>
							<tr className={adminTableHeadRowClass}>
								<th className={adminTableHeadCellClass}>Name</th>
								<th className={adminTableHeadCellClass}>Email</th>
								<th className={adminTableHeadCellClass}>Role</th>
								<th className={adminTableHeadCellClass}>Account</th>
								<th className={adminTableHeadCellClass}>Subscription</th>
								<th className={adminTableHeadCellClass}>Journal access</th>
							</tr>
						</thead>
						<tbody>
							{USERS_TABLE_SKELETON_ROWS.map((rowKey) => (
								<tr
									key={rowKey}
									className="border-border border-b last:border-0"
								>
									<td className="px-4 py-3">
										<Skeleton className="h-4 w-32" />
									</td>
									<td className="px-4 py-3">
										<Skeleton className="h-4 w-48" />
									</td>
									<td className="px-4 py-3">
										<Skeleton className="h-5 w-16 rounded-full" />
									</td>
									<td className="px-4 py-3">
										<Skeleton className="h-5 w-20 rounded-full" />
									</td>
									<td className="px-4 py-3">
										<Skeleton className="h-5 w-24 rounded-full" />
									</td>
									<td className="px-4 py-3">
										<Skeleton className="h-5 w-12 rounded-full" />
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>
		);
	}

	if (users.length === 0) {
		return (
			<div
				className={cn(
					adminCardClass,
					"p-8 text-center text-muted-foreground text-sm",
				)}
			>
				No users match your filters.
			</div>
		);
	}

	return (
		<div className={cn(adminCardClass, "overflow-hidden")}>
			<div className="overflow-x-auto">
				<table className="w-full min-w-[760px] text-left text-sm">
					<thead>
						<tr className={adminTableHeadRowClass}>
							<th className={adminTableHeadCellClass}>Name</th>
							<th className={adminTableHeadCellClass}>Email</th>
							<th className={adminTableHeadCellClass}>Role</th>
							<th className={adminTableHeadCellClass}>Account</th>
							<th className={adminTableHeadCellClass}>Subscription</th>
							<th className={adminTableHeadCellClass}>Journal access</th>
						</tr>
					</thead>
					<tbody>
						{users.map((user) => (
							<tr
								key={user._id}
								className={adminTableRowClass}
								onClick={() => onSelectUser(user._id)}
								onKeyDown={(e) => {
									if (e.key === "Enter" || e.key === " ") {
										e.preventDefault();
										onSelectUser(user._id);
									}
								}}
								tabIndex={0}
							>
								<td className={adminTableCellPrimaryClass}>
									{user.name || "—"}
								</td>
								<td className={adminTableCellMutedClass}>{user.email}</td>
								<td className="px-4 py-3">
									<RoleBadge role={user.role} />
								</td>
								<td className="px-4 py-3">
									<AccountStatusBadge status={user.accountStatus} />
								</td>
								<td className="px-4 py-3">
									<SubscriptionStatusBadge
										status={user.subscriptionStatus}
										betaAccess={user.betaAccess}
									/>
								</td>
								<td className="px-4 py-3">
									<PaidAccessBadge hasAccess={user.hasPaidJournalAccess} />
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}
