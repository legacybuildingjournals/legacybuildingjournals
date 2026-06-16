import { api } from "@legacy-building/backend/convex/_generated/api";
import { brand } from "@legacy-building/ui/lib/brand-journal";
import { cn } from "@legacy-building/ui/lib/utils";
import { useAction, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { ConvexError } from "convex/values";
import { ExternalLink, Loader2, Receipt } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { CancelSubscriptionModal } from "@/components/billing/CancelSubscriptionModal";

import { BILLING_SUBSCRIBE_COPY } from "@/lib/billing/billingContent";
import {
	formatAmount,
	intervalLabel,
	intervalSuffix,
} from "@/lib/billing/plans";
import { ROUTES } from "@/lib/routes";

function messageFromError(error: unknown): string {
	if (error instanceof ConvexError) {
		const data = error.data as { message?: string } | string | undefined;
		if (typeof data === "string") return data;
		if (data?.message) return data.message;
	}
	return "Something went wrong. Please try again.";
}

function formatDate(seconds: number) {
	return new Date(seconds * 1000).toLocaleDateString(undefined, {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
}

function formatMoney(amountInCents: number) {
	return `$${(amountInCents / 100).toFixed(2)}`;
}

type Subscription = NonNullable<
	FunctionReturnType<typeof api.stripe.queries.getMySubscription>
>;

function describeSubscription(subscription: Subscription) {
	const priceLabel =
		subscription.plan && subscription.interval
			? `${formatAmount(subscription.plan.amountCents, subscription.plan.currency)} ${intervalSuffix(subscription.interval)}`
			: "—";
	const name =
		subscription.plan?.name ??
		(subscription.interval
			? intervalLabel(subscription.interval)
			: "Subscription");
	const periodEnd = subscription.currentPeriodEnd
		? formatDate(subscription.currentPeriodEnd)
		: null;

	if (subscription.status === "trialing") {
		return {
			name,
			priceLabel,
			stateLabel: "Free trial",
			detail: periodEnd
				? `Trial ends ${periodEnd}${subscription.cancelAtPeriodEnd ? " — won't renew" : ", then billing begins"}`
				: BILLING_SUBSCRIBE_COPY.trialStateLabel,
		};
	}
	if (subscription.status === "active") {
		return {
			name,
			priceLabel,
			stateLabel: subscription.cancelAtPeriodEnd ? "Canceling" : "Active",
			detail: periodEnd
				? subscription.cancelAtPeriodEnd
					? `Access ends ${periodEnd}`
					: `Renews ${periodEnd}`
				: "Active subscription",
		};
	}
	if (subscription.status === "past_due" || subscription.status === "unpaid") {
		return {
			name,
			priceLabel,
			stateLabel: "Payment past due",
			detail: "Update your payment method to keep your subscription.",
		};
	}
	return {
		name,
		priceLabel,
		stateLabel: "Canceled",
		detail: periodEnd ? `Ended ${periodEnd}` : "No longer active",
	};
}

function formatDateMs(ms: number) {
	return new Date(ms).toLocaleDateString(undefined, {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
}

const STORE_INFO = {
	apple: {
		name: "the App Store",
		url: "https://apps.apple.com/account/subscriptions",
	},
	google: {
		name: "Google Play",
		url: "https://play.google.com/store/account/subscriptions",
	},
} as const;

/**
 * Apple/Google subscriptions can only be managed in their store — the web app
 * is not allowed to cancel or change them. Show a read-only summary + a link.
 */
function StoreManagedSubscription({
	provider,
	isTrial,
	currentPeriodEnd,
	willRenew,
}: {
	provider: "apple" | "google";
	isTrial: boolean;
	currentPeriodEnd: number | null;
	willRenew: boolean | null;
}) {
	const info = STORE_INFO[provider];
	const stateLabel = isTrial
		? "Free trial"
		: willRenew === false
			? "Canceling"
			: "Active";
	const periodEnd = currentPeriodEnd ? formatDateMs(currentPeriodEnd) : null;
	const detail = periodEnd
		? willRenew === false
			? `Access ends ${periodEnd}`
			: isTrial
				? `Trial ends ${periodEnd}`
				: `Renews ${periodEnd}`
		: null;

	return (
		<div className="mx-auto flex w-full max-w-[960px] flex-col gap-6 border-white/10 border-t pt-10">
			<div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-5 sm:px-6">
				<p className="mb-3 font-medium text-white/55 text-xs uppercase tracking-[0.12em]">
					Your subscription
				</p>
				<div className="flex flex-col gap-1">
					<h2 className="font-semibold text-lg text-white">
						Legacy Building Pro
					</h2>
					<div className="flex flex-wrap items-center gap-2 text-sm">
						<span className="rounded-full bg-white/15 px-2.5 py-1 font-medium text-white text-xs">
							{stateLabel}
						</span>
						{detail ? (
							<span className="text-white/60 text-xs">{detail}</span>
						) : null}
					</div>
				</div>
				<p className="mt-4 text-sm text-white/60">
					You subscribed through {info.name}, so your plan can only be changed
					or canceled there. Open your {info.name} subscription settings to
					manage it.
				</p>
				<a
					href={info.url}
					target="_blank"
					rel="noopener noreferrer"
					className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-4 font-medium text-sm text-white transition-colors hover:bg-white/15"
				>
					<ExternalLink className="size-3.5" aria-hidden />
					Manage in {info.name}
				</a>
			</div>
		</div>
	);
}

function invoiceBadge(status: string) {
	switch (status) {
		case "paid":
			return { label: "Paid", bg: "rgba(255,255,255,0.15)", color: "#ffffff" };
		case "open":
			return { label: "Due", bg: "#fff4db", color: brand.alert };
		default:
			return { label: status, bg: "rgba(255,255,255,0.1)", color: "#ffffff" };
	}
}

export function BillingManagementSection() {
	const entitlement = useQuery(api.subscriptions.queries.getEntitlement);
	const subscription = useQuery(api.stripe.queries.getMySubscription);
	const invoices = useQuery(api.stripe.queries.listMyInvoices);
	const createBillingPortalSession = useAction(
		api.stripe.actions.createBillingPortalSession,
	);
	const cancelSubscription = useAction(api.stripe.actions.cancelSubscription);
	const reactivateSubscription = useAction(
		api.stripe.actions.reactivateSubscription,
	);

	const [portalPending, setPortalPending] = useState(false);
	const [mutationPending, setMutationPending] = useState(false);
	const [cancelModalOpen, setCancelModalOpen] = useState(false);

	// Apple/Google subscribers manage their plan in the store, not here.
	if (entitlement?.provider === "apple" || entitlement?.provider === "google") {
		return (
			<StoreManagedSubscription
				provider={entitlement.provider}
				isTrial={entitlement.isTrial}
				currentPeriodEnd={entitlement.currentPeriodEnd}
				willRenew={entitlement.willRenew}
			/>
		);
	}

	const hasActivePlan =
		subscription !== null &&
		subscription !== undefined &&
		(subscription.status === "active" ||
			subscription.status === "trialing" ||
			subscription.status === "past_due" ||
			subscription.status === "unpaid");

	if (!hasActivePlan || !subscription) return null;

	const summary = describeSubscription(subscription);
	const canCancel = hasActivePlan && !subscription.cancelAtPeriodEnd;
	const canReactivate = hasActivePlan && subscription.cancelAtPeriodEnd;
	const planName =
		subscription.plan?.name ??
		(subscription.interval
			? `${intervalLabel(subscription.interval)} Plan`
			: "Subscription");
	const cancelPlanSummary =
		subscription.plan && subscription.interval
			? `${planName} · ${formatAmount(subscription.plan.amountCents, subscription.plan.currency)}${intervalSuffix(subscription.interval).replace(" /", "/")}`
			: planName;
	const periodEndDate = subscription.currentPeriodEnd
		? formatDate(subscription.currentPeriodEnd)
		: "—";

	const openPortal = async () => {
		if (portalPending) return;
		setPortalPending(true);
		try {
			const { url } = await createBillingPortalSession({
				returnUrl: `${window.location.origin}${ROUTES.dashboardBilling}`,
			});
			window.location.href = url;
		} catch (error) {
			toast.error(messageFromError(error));
			setPortalPending(false);
		}
	};

	const handleCancel = async () => {
		if (mutationPending) return;
		setMutationPending(true);
		try {
			await cancelSubscription({ atPeriodEnd: true });
			toast.success("Your subscription will end at the period close.");
			setCancelModalOpen(false);
		} catch (error) {
			toast.error(messageFromError(error));
		} finally {
			setMutationPending(false);
		}
	};

	const handleReactivate = async () => {
		if (mutationPending) return;
		setMutationPending(true);
		try {
			await reactivateSubscription({});
			toast.success("Your subscription will continue to renew.");
		} catch (error) {
			toast.error(messageFromError(error));
		} finally {
			setMutationPending(false);
		}
	};

	return (
		<div className="mx-auto flex w-full max-w-[960px] flex-col gap-6 border-white/10 border-t pt-10">
			<div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-5 sm:px-6">
				<p className="mb-3 font-medium text-white/55 text-xs uppercase tracking-[0.12em]">
					Your subscription
				</p>
				<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
					<div className="flex flex-col gap-1">
						<div className="flex items-baseline gap-2">
							<h2 className="font-semibold text-lg text-white">
								{summary.name}
							</h2>
							<span className="text-sm text-white/65">
								{summary.priceLabel}
							</span>
						</div>
						<div className="flex flex-wrap items-center gap-2 text-sm">
							<span className="rounded-full bg-white/15 px-2.5 py-1 font-medium text-white text-xs">
								{summary.stateLabel}
							</span>
							<span className="text-white/60 text-xs">{summary.detail}</span>
						</div>
					</div>
					<div className="flex flex-wrap gap-2">
						<button
							type="button"
							onClick={openPortal}
							disabled={portalPending}
							className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-4 font-medium text-sm text-white hover:bg-white/15 disabled:opacity-60"
						>
							{portalPending ? (
								<Loader2 className="size-4 animate-spin" aria-hidden />
							) : (
								<ExternalLink className="size-3.5" aria-hidden />
							)}
							Manage billing
						</button>
						{canReactivate ? (
							<button
								type="button"
								onClick={handleReactivate}
								disabled={mutationPending}
								className="inline-flex h-9 items-center rounded-lg border border-white/30 px-4 font-medium text-sm text-white hover:bg-white/10 disabled:opacity-60"
							>
								Resume subscription
							</button>
						) : null}
						{canCancel ? (
							<button
								type="button"
								onClick={() => setCancelModalOpen(true)}
								className="inline-flex h-9 items-center rounded-lg border border-white/20 px-4 font-medium text-sm text-white/80 hover:text-white"
							>
								Cancel subscription
							</button>
						) : null}
					</div>
				</div>
			</div>

			{invoices && invoices.length > 0 ? (
				<div className="rounded-2xl border border-white/10 bg-white/5">
					<div className="flex items-center justify-between px-5 py-4 sm:px-6">
						<h3 className="font-semibold text-base text-white">
							Invoice history
						</h3>
						<span className="text-white/50 text-xs">
							{invoices.length} {invoices.length === 1 ? "invoice" : "invoices"}
						</span>
					</div>
					<ul className="divide-y divide-white/10 border-white/10 border-t">
						{invoices.map((invoice) => {
							const badge = invoiceBadge(invoice.status);
							const amount =
								invoice.status === "paid"
									? invoice.amountPaid
									: invoice.amountDue;
							return (
								<li
									key={invoice.stripeInvoiceId}
									className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"
								>
									<div className="flex flex-col gap-0.5">
										<span className="font-medium text-sm text-white">
											{formatMoney(amount)}
										</span>
										<span className="text-white/50 text-xs">
											{formatDate(invoice.created)}
										</span>
									</div>
									<div className="flex items-center gap-3">
										<span
											className="inline-flex items-center rounded-full px-2.5 py-1 font-medium text-xs"
											style={{
												backgroundColor: badge.bg,
												color: badge.color,
											}}
										>
											{badge.label}
										</span>
										<button
											type="button"
											onClick={openPortal}
											disabled={portalPending}
											className={cn(
												"inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/20 px-3 font-medium text-white text-xs",
												"hover:bg-white/10 disabled:opacity-60",
											)}
										>
											<ExternalLink className="size-3.5" aria-hidden />
											View
										</button>
									</div>
								</li>
							);
						})}
					</ul>
				</div>
			) : invoices?.length === 0 ? (
				<div className="flex flex-col items-center gap-2 py-6 text-center">
					<Receipt className="size-8 text-white/30" aria-hidden />
					<p className="text-sm text-white/60">No invoices yet</p>
				</div>
			) : null}

			<CancelSubscriptionModal
				open={cancelModalOpen}
				onOpenChange={setCancelModalOpen}
				planSummary={cancelPlanSummary}
				periodEndDate={periodEndDate}
				onConfirm={handleCancel}
				pending={mutationPending}
			/>
		</div>
	);
}
