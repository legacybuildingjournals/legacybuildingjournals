import { cn } from "@legacy-building/ui/lib/utils";

type SubscriptionStatus =
	| "active"
	| "trialing"
	| "grace_period"
	| "canceled"
	| "none"
	| "beta"
	| null;

const LABELS: Record<NonNullable<SubscriptionStatus>, string> = {
	active: "Active",
	trialing: "Trialing",
	grace_period: "Grace period",
	canceled: "Canceled",
	none: "None",
	beta: "Beta",
};

const STYLES: Record<NonNullable<SubscriptionStatus>, string> = {
	active: "bg-[#ebf6f6] text-[#008080] dark:bg-primary/20 dark:text-primary",
	trialing:
		"bg-[#fff4db] text-[#8a6a00] dark:bg-amber-500/15 dark:text-amber-300",
	grace_period:
		"bg-[#fff4db] text-[#8a6a00] dark:bg-amber-500/15 dark:text-amber-300",
	canceled:
		"bg-[#f2f2f2] text-[#525252] dark:bg-muted dark:text-muted-foreground",
	none: "bg-[#f2f2f2] text-[#8a8a8a] dark:bg-muted dark:text-muted-foreground",
	beta: "bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
};

export function SubscriptionStatusBadge({
	status,
	betaAccess,
}: {
	status: SubscriptionStatus;
	betaAccess?: boolean;
}) {
	if (betaAccess) {
		return (
			<span
				className={cn(
					"inline-flex rounded-full px-2.5 py-0.5 font-medium text-xs",
					STYLES.beta,
				)}
			>
				{LABELS.beta}
			</span>
		);
	}

	if (!status) {
		return (
			<span className="inline-flex rounded-full bg-muted px-2.5 py-0.5 font-medium text-muted-foreground text-xs">
				Not set
			</span>
		);
	}

	return (
		<span
			className={cn(
				"inline-flex rounded-full px-2.5 py-0.5 font-medium text-xs",
				STYLES[status],
			)}
		>
			{LABELS[status]}
		</span>
	);
}

export function AccountStatusBadge({
	status,
}: {
	status: "active" | "suspended";
}) {
	const isSuspended = status === "suspended";
	return (
		<span
			className={cn(
				"inline-flex rounded-full px-2.5 py-0.5 font-medium text-xs",
				isSuspended
					? "bg-[#fde8e5] text-[#b0200c] dark:bg-destructive/20 dark:text-red-300"
					: "bg-[#ebf6f6] text-[#008080] dark:bg-primary/20 dark:text-primary",
			)}
		>
			{isSuspended ? "Suspended" : "Active"}
		</span>
	);
}

export function RoleBadge({ role }: { role: "admin" | "user" }) {
	const isAdmin = role === "admin";
	return (
		<span
			className={cn(
				"inline-flex rounded-full px-2.5 py-0.5 font-medium text-xs",
				isAdmin
					? "bg-[#008080] text-white dark:bg-primary dark:text-primary-foreground"
					: "bg-muted text-muted-foreground",
			)}
		>
			{isAdmin ? "Admin" : "User"}
		</span>
	);
}

export function PaidAccessBadge({ hasAccess }: { hasAccess: boolean }) {
	return (
		<span
			className={cn(
				"inline-flex rounded-full px-2.5 py-0.5 font-medium text-xs",
				hasAccess
					? "bg-green-50 text-green-700 dark:bg-green-500/15 dark:text-green-300"
					: "bg-muted text-muted-foreground",
			)}
		>
			{hasAccess ? "Yes" : "No"}
		</span>
	);
}

export function StripeStatusBadge({ status }: { status: string | null }) {
	if (!status) {
		return (
			<span className="inline-flex rounded-full bg-muted px-2.5 py-0.5 font-medium text-muted-foreground text-xs">
				No Stripe sub
			</span>
		);
	}
	return (
		<span className="inline-flex rounded-full bg-muted px-2.5 py-0.5 font-medium text-muted-foreground text-xs capitalize">
			{status.replace(/_/g, " ")}
		</span>
	);
}
