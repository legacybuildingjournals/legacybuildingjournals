import { api } from "@legacy-building/backend/convex/_generated/api";
import { cn } from "@legacy-building/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import { useAction, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { Check, Download, ExternalLink, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
	billingCardPaddingClass,
	billingHeaderActionClass,
	billingPageShellClass,
	billingPageSubtitleClass,
	billingPageTitleClass,
} from "@/components/billing/billingLayoutStyles";
import { CancelSubscriptionModal } from "@/components/billing/CancelSubscriptionModal";
import { ContactSupportModal } from "@/components/billing/ContactSupportModal";
import {
	type BillingInvoice,
	ViewInvoicesModal,
} from "@/components/billing/ViewInvoicesModal";
import {
	BILLING_PLAN_ACTION_COPY,
	MANAGE_PLAN_FEATURES,
} from "@/lib/billing/billingContent";
import { formatAmount, intervalSuffix } from "@/lib/billing/plans";
import { ROUTES } from "@/lib/routes";

function formatDate(seconds: number) {
	return new Date(seconds * 1000).toLocaleDateString(undefined, {
		year: "numeric",
		month: "long",
		day: "numeric",
	});
}
function formatMoney(amountInCents: number) {
	return `$${(amountInCents / 100).toFixed(2)}`;
}

function formatCardBrand(brandName: string) {
	return brandName.charAt(0).toUpperCase() + brandName.slice(1);
}

function messageFromError(error: unknown): string {
	if (error instanceof ConvexError) {
		const data = error.data as { message?: string } | string | undefined;
		if (typeof data === "string") return data;
		if (data?.message) return data.message;
	}
	return "Something went wrong. Please try again.";
}

const billingOutlineButtonClass =
	"inline-flex items-center justify-center rounded-xl border border-primary/30 bg-card font-medium text-primary text-sm transition-[color,background-color,transform] hover:bg-muted active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2";

const billingPrimaryButtonClass =
	"inline-flex items-center justify-center rounded-xl bg-primary font-medium text-primary-foreground text-sm transition-[opacity,transform] hover:opacity-95 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2";

const billingTextLinkClass =
	"font-medium text-primary text-sm transition-colors hover:underline active:scale-[0.98] active:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-60";

const billingCancelButtonClass =
	"inline-flex h-11 items-center justify-center rounded-xl border border-red-100 bg-red-50 px-6 font-medium text-red-600 text-sm transition-[color,background-color,transform] hover:bg-red-100 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200 focus-visible:ring-offset-2 disabled:opacity-60";

const billingIconButtonClass =
	"inline-flex items-center justify-center rounded-lg border border-border text-muted-foreground transition-[color,background-color,transform] hover:bg-card active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-40";

const billingCardActionButtonClass =
	"flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-muted text-muted-foreground text-sm transition-[color,background-color,transform] hover:bg-card active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-60";

type BillingActivePageProps = {
	showWelcome?: boolean;
};

export function BillingActivePage({ showWelcome }: BillingActivePageProps) {
	const subscription = useQuery(api.stripe.queries.getMySubscription);
	const listInvoicesLive = useAction(api.stripe.actions.listMyInvoicesLive);
	const getDefaultPaymentMethod = useAction(
		api.stripe.actions.getDefaultPaymentMethod,
	);
	const createBillingPortalSession = useAction(
		api.stripe.actions.createBillingPortalSession,
	);
	const cancelSubscription = useAction(api.stripe.actions.cancelSubscription);
	const reactivateSubscription = useAction(
		api.stripe.actions.reactivateSubscription,
	);

	const [paymentMethod, setPaymentMethod] = useState<{
		brand: string;
		last4: string;
		expMonth: number;
		expYear: number;
	} | null>(null);
	const [portalPending, setPortalPending] = useState(false);
	const [cancelPending, setCancelPending] = useState(false);
	const [reactivatePending, setReactivatePending] = useState(false);
	const [cancelModalOpen, setCancelModalOpen] = useState(false);
	const [supportModalOpen, setSupportModalOpen] = useState(false);
	const [invoices, setInvoices] = useState<BillingInvoice[]>([]);
	const [invoicesLoading, setInvoicesLoading] = useState(true);
	const [invoicesModalOpen, setInvoicesModalOpen] = useState(false);
	// Stripe APIs (payment methods, invoices) only apply to Stripe subscribers.
	// Apple/Google subs have no Stripe customer — skip those calls entirely.
	const subProvider = subscription?.provider ?? "stripe";

	useEffect(() => {
		if (subProvider !== "stripe") return;
		if (showWelcome) {
			toast.success("Your subscription is active!");
			void getDefaultPaymentMethod({}).then(setPaymentMethod);
			let cancelled = false;
			setInvoicesLoading(true);
			void listInvoicesLive({})
				.then((rows) => {
					if (!cancelled) setInvoices(rows);
				})
				.finally(() => {
					if (!cancelled) setInvoicesLoading(false);
				});
			return () => {
				cancelled = true;
			};
		}
	}, [showWelcome, getDefaultPaymentMethod, listInvoicesLive, subProvider]);

	useEffect(() => {
		if (subProvider !== "stripe") return;
		void getDefaultPaymentMethod({}).then(setPaymentMethod);
	}, [getDefaultPaymentMethod, subProvider]);

	useEffect(() => {
		if (subProvider !== "stripe") {
			setInvoicesLoading(false);
			return;
		}
		let cancelled = false;
		void listInvoicesLive({})
			.then((rows) => {
				if (!cancelled) setInvoices(rows);
			})
			.finally(() => {
				if (!cancelled) setInvoicesLoading(false);
			});
		return () => {
			cancelled = true;
		};
	}, [listInvoicesLive, subProvider]);

	if (!subscription) return null;

	// Subscriptions bought through Apple/Google can only be changed or cancelled in
	// their own store — Stripe (and this server) can't touch them. Show a read-only
	// notice for those and hide the Stripe-only upgrade/cancel controls.
	const provider = (subscription.provider ?? "stripe") as
		| "stripe"
		| "apple"
		| "google";
	const isStripe = provider === "stripe";
	const storeLabel =
		provider === "apple"
			? "the App Store"
			: provider === "google"
				? "Google Play"
				: "Stripe";
	const storeUrl =
		provider === "google"
			? "https://play.google.com/store/account/subscriptions"
			: "https://apps.apple.com/account/subscriptions";

	const planName = subscription.plan?.name
		? `${subscription.plan.name} Plan`
		: subscription.interval === "annual"
			? "Annual Plan"
			: "Monthly Plan";
	const priceLabel =
		subscription.plan && subscription.interval
			? `${formatAmount(subscription.plan.amountCents, subscription.plan.currency)} ${intervalSuffix(subscription.interval)}`
			: "—";
	const renewLabel =
		subscription.status === "trialing"
			? "Trial ends"
			: subscription.cancelAtPeriodEnd
				? "Access ends"
				: "Renews on";
	const renewDate = subscription.currentPeriodEnd
		? formatDate(subscription.currentPeriodEnd)
		: "—";
	const cancelPlanSummary =
		subscription.plan && subscription.interval
			? `${planName} · ${formatAmount(subscription.plan.amountCents, subscription.plan.currency)}${intervalSuffix(subscription.interval).replace(" /", "/")}`
			: planName;
	const latestInvoice = invoices[0];
	const showUpgrade =
		!subscription.cancelAtPeriodEnd && subscription.interval !== "annual";

	const openInvoice = (invoice: BillingInvoice) => {
		if (invoice.hostedInvoiceUrl) {
			window.open(invoice.hostedInvoiceUrl, "_blank", "noopener,noreferrer");
		}
	};

	const openPortal = async (returnPath = ROUTES.dashboardBilling) => {
		if (portalPending) return;
		setPortalPending(true);
		try {
			const { url } = await createBillingPortalSession({
				returnUrl: `${window.location.origin}${returnPath}`,
			});
			window.location.href = url;
		} catch (error) {
			toast.error(messageFromError(error));
			setPortalPending(false);
		}
	};

	const handleCancel = async () => {
		if (cancelPending) return;
		setCancelPending(true);
		try {
			await cancelSubscription({ atPeriodEnd: true });
			toast.success("Your subscription will end at the period close.");
			setCancelModalOpen(false);
		} catch (error) {
			toast.error(messageFromError(error));
		} finally {
			setCancelPending(false);
		}
	};

	const handleReactivate = async () => {
		if (reactivatePending) return;
		setReactivatePending(true);
		try {
			await reactivateSubscription({});
			toast.success("Your subscription will continue to renew.");
		} catch (error) {
			toast.error(messageFromError(error));
		} finally {
			setReactivatePending(false);
		}
	};

	return (
		<div className="relative flex min-h-svh w-full flex-col bg-secondary">
			<div className={billingPageShellClass}>
				<div className="mx-auto flex w-full max-w-[1100px] flex-col gap-6 sm:gap-8">
					<header className="flex flex-col gap-4">
						<div className="flex min-w-0 flex-col gap-1">
							<h1 className={cn(billingPageTitleClass, "text-foreground")}>
								Billing and Plans
							</h1>
							<p className={billingPageSubtitleClass}>
								Manage your subscription, review usage, and access invoices.
							</p>
							{subscription.status === "trialing" ? (
								<p className="mt-1 font-medium text-primary text-sm">
									You&apos;re on a free trial — journal features are unlocked
									until your trial ends.
								</p>
							) : null}
						</div>
						<div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-3">
							<button
								type="button"
								onClick={() => setSupportModalOpen(true)}
								className={cn(
									billingOutlineButtonClass,
									billingHeaderActionClass,
									"px-4",
								)}
							>
								Contact Support
							</button>
							{isStripe ? (
								<Link
									to={ROUTES.dashboardBillingCompare}
									className={cn(
										billingPrimaryButtonClass,
										billingHeaderActionClass,
										"px-4",
									)}
								>
									{BILLING_PLAN_ACTION_COPY.changePlan}
								</Link>
							) : (
								<button
									type="button"
									disabled
									title={`Manage your plan in ${storeLabel}`}
									className={cn(
										billingPrimaryButtonClass,
										billingHeaderActionClass,
										"cursor-not-allowed px-4 opacity-50",
									)}
								>
									{BILLING_PLAN_ACTION_COPY.changePlan}
								</button>
							)}
						</div>
					</header>

					<div className="grid gap-4 sm:gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
						<div
							className={cn(
								"rounded-2xl border border-border bg-card shadow-sm",
								billingCardPaddingClass,
							)}
						>
							<div className="mb-4 flex flex-wrap items-center gap-2 sm:mb-6 sm:gap-3">
								<h2 className="font-semibold text-foreground text-lg sm:text-xl">
									{planName}
								</h2>
								<span className="rounded-full bg-primary px-3 py-1 font-medium text-primary-foreground text-xs">
									Current Plan
								</span>
							</div>

							<p className="mb-6 font-semibold text-base text-foreground sm:text-lg">
								{priceLabel}
								<span className="mt-1 block font-normal text-muted-foreground text-sm sm:mt-0 sm:inline sm:text-base">
									{" "}
									— {renewLabel} {renewDate}
								</span>
							</p>

							<div className="mb-8">
								<p className="mb-3 font-medium text-muted-foreground text-sm">
									Your plan includes
								</p>
								<ul className="flex flex-col gap-2.5">
									{MANAGE_PLAN_FEATURES.map((feature) => (
										<li
											key={feature}
											className="flex items-center gap-2.5 text-foreground text-sm"
										>
											<Check
												className="size-4 shrink-0 text-primary"
												aria-hidden
											/>
											{feature}
										</li>
									))}
								</ul>
							</div>

							<div className="flex w-full flex-col gap-3 border-border border-t pt-6 sm:flex-row sm:items-center sm:justify-start">
								{isStripe ? (
									<>
										{showUpgrade ? (
											<Link
												to={ROUTES.dashboardBillingCompare}
												className={cn(
													billingPrimaryButtonClass,
													"h-11 w-full px-6 font-semibold sm:w-auto",
												)}
											>
												{BILLING_PLAN_ACTION_COPY.changePlan}
											</Link>
										) : null}
										{subscription.cancelAtPeriodEnd ? (
											<button
												type="button"
												onClick={() => void handleReactivate()}
												disabled={reactivatePending}
												className={cn(
													billingPrimaryButtonClass,
													"h-11 w-full px-6 font-semibold sm:w-auto",
												)}
											>
												{reactivatePending ? (
													<Loader2
														className="size-4 animate-spin"
														aria-hidden
													/>
												) : null}
												Reactivate Subscription
											</button>
										) : (
											<button
												type="button"
												onClick={() => setCancelModalOpen(true)}
												disabled={cancelPending}
												className={cn(
													billingCancelButtonClass,
													"w-full sm:w-auto",
												)}
											>
												Cancel Plan
											</button>
										)}
									</>
								) : (
									<p className="text-muted-foreground text-sm leading-relaxed">
										This subscription is managed through {storeLabel}. To change
										your plan or cancel, open your subscriptions in {storeLabel}{" "}
										on the device where you subscribed.
									</p>
								)}
							</div>
						</div>

						{isStripe ? (
							<div className="flex flex-col gap-6">
								<div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
									<h3 className="mb-4 font-semibold text-foreground text-lg">
										Billing History
									</h3>
									{invoicesLoading ? (
										<p className="mb-4 text-muted-foreground text-sm">
											Loading invoices…
										</p>
									) : latestInvoice ? (
										<div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-border bg-muted px-4 py-3">
											<div className="min-w-0">
												<p className="truncate font-medium text-foreground text-sm">
													Invoice #{latestInvoice.stripeInvoiceId.slice(-7)}
												</p>
												<p className="text-muted-foreground text-xs">
													{formatDate(latestInvoice.created)}
												</p>
											</div>
											<div className="flex shrink-0 items-center gap-2">
												<span className="font-semibold text-foreground text-sm">
													{formatMoney(
														latestInvoice.status === "paid"
															? latestInvoice.amountPaid
															: latestInvoice.amountDue,
													)}
												</span>
												{latestInvoice.status === "paid" ? (
													<span className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-[10px] text-primary">
														Paid
													</span>
												) : null}
												<button
													type="button"
													onClick={() => openInvoice(latestInvoice)}
													disabled={!latestInvoice.hostedInvoiceUrl}
													className={cn(billingIconButtonClass, "size-8")}
													aria-label="Download invoice"
												>
													<Download className="size-4" aria-hidden />
												</button>
											</div>
										</div>
									) : (
										<p className="mb-4 text-muted-foreground text-sm">
											No invoices yet — trial plans may not show a charge until
											billing starts.
										</p>
									)}
									<button
										type="button"
										onClick={() => setInvoicesModalOpen(true)}
										className={billingTextLinkClass}
									>
										View Invoices
									</button>
								</div>

								<div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
									<div className="mb-4 flex items-center justify-between gap-3">
										<h3 className="font-semibold text-foreground text-lg">
											Payment Methods
										</h3>
										<button
											type="button"
											onClick={() => void openPortal()}
											disabled={portalPending}
											className={billingTextLinkClass}
										>
											Add Method
										</button>
									</div>
									{paymentMethod ? (
										<div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted px-4 py-3">
											<div>
												<p className="font-medium text-foreground text-sm">
													{formatCardBrand(paymentMethod.brand)} ••••{" "}
													{paymentMethod.last4}
												</p>
												<p className="text-muted-foreground text-xs">
													{String(paymentMethod.expMonth).padStart(2, "0")}/
													{paymentMethod.expYear}
												</p>
											</div>
											<button
												type="button"
												onClick={() => void openPortal()}
												disabled={portalPending}
												className={billingTextLinkClass}
											>
												Edit
											</button>
										</div>
									) : (
										<button
											type="button"
											onClick={() => void openPortal()}
											disabled={portalPending}
											className={cn(billingCardActionButtonClass, "px-4 py-6")}
										>
											{portalPending ? (
												<Loader2 className="size-4 animate-spin" aria-hidden />
											) : (
												<ExternalLink className="size-4" aria-hidden />
											)}
											Manage payment methods in Stripe
										</button>
									)}
								</div>
							</div>
						) : (
							<div className="flex flex-col gap-6">
								<div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
									<h3 className="mb-2 font-semibold text-foreground text-lg">
										Billing &amp; receipts
									</h3>
									<p className="mb-4 text-muted-foreground text-sm leading-relaxed">
										Your payment method and billing history are handled by{" "}
										{storeLabel}. View receipts or update payment in your{" "}
										{storeLabel} subscription settings.
									</p>
									<a
										href={storeUrl}
										target="_blank"
										rel="noopener noreferrer"
										className={cn(billingCardActionButtonClass, "px-4 py-3")}
									>
										<ExternalLink className="size-4" aria-hidden />
										Open {storeLabel}
									</a>
								</div>
							</div>
						)}
					</div>
				</div>
			</div>

			<ViewInvoicesModal
				open={invoicesModalOpen}
				onOpenChange={setInvoicesModalOpen}
				invoices={invoices}
				loading={invoicesLoading}
			/>

			<CancelSubscriptionModal
				open={cancelModalOpen}
				onOpenChange={setCancelModalOpen}
				planSummary={cancelPlanSummary}
				periodEndDate={renewDate}
				onConfirm={handleCancel}
				pending={cancelPending}
			/>

			<ContactSupportModal
				open={supportModalOpen}
				onOpenChange={setSupportModalOpen}
			/>
		</div>
	);
}
