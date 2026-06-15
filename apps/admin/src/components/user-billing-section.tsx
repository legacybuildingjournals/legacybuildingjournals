type BillingPlan = {
	name: string;
	interval: "monthly" | "annual";
	amountCents: number;
	currency: string;
};

function formatAmount(amountCents: number, currency = "usd") {
	return new Intl.NumberFormat(undefined, {
		style: "currency",
		currency: currency.toUpperCase(),
		minimumFractionDigits: amountCents % 100 === 0 ? 0 : 2,
	}).format(amountCents / 100);
}

function intervalSuffix(interval: "monthly" | "annual") {
	return interval === "annual" ? "/year" : "/month";
}

type BillingDetail = {
	hasPaidFeatureAccess: boolean;
	hasPaidJournalAccessMirror: boolean;
	stripeCustomerId: string | null;
	stripeSubscriptionId: string | null;
	stripeStatus: string | null;
	cancelAtPeriodEnd: boolean;
	cancelAt: number | null;
	currentPeriodEnd: number | null;
	plan: BillingPlan | null;
	pendingPlanChange: {
		interval: "monthly" | "annual";
		effectiveAt: number;
	} | null;
	mirroredSubscriptionStatus:
		| "active"
		| "trialing"
		| "grace_period"
		| "canceled"
		| "none"
		| null;
	betaAccess: boolean;
};

function formatEpochDate(seconds: number | null) {
	if (!seconds) return "—";
	return new Date(seconds * 1000).toLocaleDateString(undefined, {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
}

function formatMsDate(ms: number | null) {
	if (!ms) return "—";
	return new Date(ms).toLocaleDateString(undefined, {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
}

type UserBillingSectionProps = {
	billing: BillingDetail;
	stripeCustomerId: string | null;
};

export function UserBillingSection({
	billing,
	stripeCustomerId,
}: UserBillingSectionProps) {
	const planLabel = billing.plan
		? `${billing.plan.name} (${formatAmount(billing.plan.amountCents, billing.plan.currency)}${intervalSuffix(billing.plan.interval)})`
		: "—";

	const renewalLabel = billing.cancelAtPeriodEnd
		? "Access ends"
		: billing.stripeStatus === "trialing"
			? "Trial ends"
			: "Renews";

	return (
		<div className="space-y-3 rounded-xl border border-border bg-muted/30 p-4">
			<h3 className="font-medium text-popover-foreground text-sm">
				Billing & subscription
			</h3>
			<dl className="grid gap-2 text-sm">
				<div className="flex items-start justify-between gap-4">
					<dt className="text-muted-foreground">Journal access (live)</dt>
					<dd className="font-medium text-popover-foreground">
						{billing.hasPaidFeatureAccess
							? billing.betaAccess
								? "Beta — unlocked"
								: "Paid — unlocked"
							: "Locked"}
					</dd>
				</div>
				{billing.betaAccess ? (
					<div className="flex items-start justify-between gap-4">
						<dt className="text-muted-foreground">Beta access</dt>
						<dd className="font-medium text-popover-foreground">Active</dd>
					</div>
				) : null}
				<div className="flex items-start justify-between gap-4">
					<dt className="text-muted-foreground">Mirrored status</dt>
					<dd className="font-medium text-popover-foreground capitalize">
						{billing.mirroredSubscriptionStatus?.replace(/_/g, " ") ??
							"Not set"}
					</dd>
				</div>
				<div className="flex items-start justify-between gap-4">
					<dt className="text-muted-foreground">Stripe status</dt>
					<dd className="font-medium text-popover-foreground capitalize">
						{billing.stripeStatus?.replace(/_/g, " ") ?? "—"}
						{billing.cancelAtPeriodEnd ? " (canceling)" : ""}
					</dd>
				</div>
				<div className="flex items-start justify-between gap-4">
					<dt className="text-muted-foreground">Plan</dt>
					<dd className="text-right font-medium text-popover-foreground">
						{planLabel}
					</dd>
				</div>
				<div className="flex items-start justify-between gap-4">
					<dt className="text-muted-foreground">{renewalLabel}</dt>
					<dd className="font-medium text-popover-foreground">
						{formatEpochDate(billing.currentPeriodEnd)}
					</dd>
				</div>
				{billing.pendingPlanChange ? (
					<div className="flex items-start justify-between gap-4">
						<dt className="text-muted-foreground">Scheduled plan change</dt>
						<dd className="text-right font-medium text-popover-foreground">
							→ {billing.pendingPlanChange.interval} on{" "}
							{formatEpochDate(billing.pendingPlanChange.effectiveAt)}
						</dd>
					</div>
				) : null}
				<div className="flex items-start justify-between gap-4">
					<dt className="text-muted-foreground">Stripe customer</dt>
					<dd className="break-all text-right font-mono text-popover-foreground text-xs">
						{stripeCustomerId ?? "—"}
					</dd>
				</div>
				{billing.stripeSubscriptionId ? (
					<div className="flex items-start justify-between gap-4">
						<dt className="text-muted-foreground">Stripe subscription</dt>
						<dd className="break-all text-right font-mono text-popover-foreground text-xs">
							{billing.stripeSubscriptionId}
						</dd>
					</div>
				) : null}
			</dl>
			{billing.betaAccess ? (
				<p className="text-muted-foreground text-xs leading-relaxed">
					Beta users have full journal access without a Stripe subscription.
					Remove beta access from the user account dialog when the trial period
					ends.
				</p>
			) : billing.mirroredSubscriptionStatus === "trialing" ? (
				<p className="text-muted-foreground text-xs leading-relaxed">
					Trial users have journal access until the trial ends or they cancel.
				</p>
			) : null}
		</div>
	);
}

export function formatOnboardingDate(ms: number | null) {
	return formatMsDate(ms);
}
