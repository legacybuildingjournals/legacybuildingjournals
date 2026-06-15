import { api } from "@legacy-building/backend/convex/_generated/api";
import { Button } from "@legacy-building/ui/components/button";
import { PageLoader } from "@legacy-building/ui/components/page-loader";
import { brand } from "@legacy-building/ui/lib/brand-journal";
import { CheckoutElementsProvider } from "@stripe/react-stripe-js/checkout";
import { loadStripe } from "@stripe/stripe-js";
import { Link, useNavigate } from "@tanstack/react-router";
import { useAction, useConvex, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { CheckoutOrderSummary } from "@/components/billing/CheckoutOrderSummary";
import { CheckoutPaymentForm } from "@/components/billing/CheckoutPaymentForm";
import type { BillingPlanChoice } from "@/lib/billing/billingContent";
import type { CheckoutFlow } from "@/lib/billing/checkoutSearch";
import { formatAmount } from "@/lib/billing/plans";
import { ROUTES } from "@/lib/routes";

function messageFromError(error: unknown): string {
	if (error instanceof ConvexError) {
		const data = error.data as { message?: string } | string | undefined;
		if (typeof data === "string") return data;
		if (data?.message) return data.message;
	}
	return "Something went wrong. Please try again.";
}

type CheckoutPageProps = {
	plan: BillingPlanChoice;
	flow: CheckoutFlow;
};

const checkoutBackLinkClass =
	"w-fit rounded-sm text-primary text-sm transition-colors hover:underline active:scale-[0.98] active:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2";

export function CheckoutPage({ plan: initialPlan, flow }: CheckoutPageProps) {
	const navigate = useNavigate();
	const convex = useConvex();
	const publishableKeyFromServer = useQuery(
		api.stripe.queries.getStripePublishableKey,
	);
	const [retriedPublishableKey, setRetriedPublishableKey] = useState<
		string | null | undefined
	>(undefined);
	const [billingConfigError, setBillingConfigError] = useState<string | null>(
		null,
	);
	const [keyRetrying, setKeyRetrying] = useState(false);
	const publishableKey =
		retriedPublishableKey !== undefined
			? retriedPublishableKey
			: publishableKeyFromServer;
	const products = useQuery(api.stripe.products.queries.listActive);
	const subscription = useQuery(api.stripe.queries.getMySubscription);
	const createEmbeddedCheckout = useAction(
		api.stripe.actions.createEmbeddedSubscriptionCheckout,
	);
	const createEmbeddedUpgradeCheckout = useAction(
		api.stripe.actions.createEmbeddedUpgradeCheckout,
	);

	const isUpgrade = flow === "upgrade";
	const [plan, setPlan] = useState<BillingPlanChoice>(initialPlan);

	const resetCheckoutSession = useCallback(() => {
		setCheckoutReady(false);
		setClientSecret(null);
		setInitializing(false);
		checkoutSessionActiveRef.current = false;
		checkoutInitKeyRef.current = null;
	}, []);

	const handlePlanChange = (nextPlan: BillingPlanChoice) => {
		if (nextPlan === plan) return;
		resetCheckoutSession();
		setPlan(nextPlan);
		void navigate({
			to: ROUTES.dashboardBillingCheckout,
			search: { plan: nextPlan, flow },
			replace: true,
		});
	};

	const [checkoutReady, setCheckoutReady] = useState(false);
	const [clientSecret, setClientSecret] = useState<string | null>(null);
	const [initializing, setInitializing] = useState(false);
	const checkoutSessionActiveRef = useRef(isUpgrade);
	const checkoutInitKeyRef = useRef<string | null>(null);
	const checkoutInitKey = `${flow}:${plan}`;

	const checkoutReturnUrl = useMemo(
		() =>
			`${window.location.origin}${ROUTES.dashboardBillingSuccess}?session_id={CHECKOUT_SESSION_ID}`,
		[],
	);

	const monthlyProduct = products?.find((p) => p.interval === "monthly");
	const annualProduct = products?.find((p) => p.interval === "annual");

	const stripePromise = useMemo(
		() => (publishableKey ? loadStripe(publishableKey) : null),
		[publishableKey],
	);

	useEffect(() => {
		if (subscription === undefined || checkoutSessionActiveRef.current) return;
		const hasActive =
			subscription &&
			(subscription.status === "active" ||
				subscription.status === "trialing" ||
				subscription.status === "past_due");
		if (hasActive && !isUpgrade) {
			void navigate({ to: ROUTES.dashboardBilling });
		}
	}, [subscription, navigate, isUpgrade]);

	useEffect(() => {
		if (!checkoutReady || !publishableKey) return;
		if (checkoutInitKeyRef.current === checkoutInitKey) return;
		checkoutInitKeyRef.current = checkoutInitKey;

		let cancelled = false;

		async function initCheckout() {
			checkoutSessionActiveRef.current = true;
			setInitializing(true);
			setClientSecret(null);
			try {
				if (isUpgrade) {
					const interval = plan === "annual" ? "annual" : "monthly";
					const result = await createEmbeddedUpgradeCheckout({
						targetInterval: interval,
						returnUrl: checkoutReturnUrl,
					});
					if (cancelled) return;
					if (result.completed) {
						window.location.href = `${window.location.origin}${ROUTES.dashboardBillingSuccess}`;
						return;
					}
					if (result.clientSecret) {
						setClientSecret(result.clientSecret);
					} else {
						throw new ConvexError({
							code: "CHECKOUT_FAILED",
							message: "Could not start upgrade checkout. Please try again.",
						});
					}
					return;
				}

				const result = await createEmbeddedCheckout({
					interval: plan === "annual" ? "annual" : "monthly",
					skipTrial: plan === "monthly",
					returnUrl: checkoutReturnUrl,
				});
				if (!cancelled) {
					setClientSecret(result.clientSecret);
				}
			} catch (error) {
				if (!cancelled) {
					toast.error(messageFromError(error));
					checkoutSessionActiveRef.current = false;
					checkoutInitKeyRef.current = null;
					void navigate({
						to: isUpgrade
							? ROUTES.dashboardBillingCompare
							: ROUTES.dashboardBilling,
					});
				}
			} finally {
				if (!cancelled) setInitializing(false);
			}
		}

		void initCheckout();
		return () => {
			cancelled = true;
		};
	}, [
		checkoutReady,
		checkoutInitKey,
		checkoutReturnUrl,
		createEmbeddedCheckout,
		createEmbeddedUpgradeCheckout,
		isUpgrade,
		navigate,
		plan,
		publishableKey,
	]);

	const activeProduct = plan === "annual" ? annualProduct : monthlyProduct;
	const payLabel = (() => {
		if (isUpgrade) {
			if (!activeProduct) return "Complete payment";
			return `Pay ${formatAmount(activeProduct.amountCents, activeProduct.currency)}`;
		}
		if (plan === "trial") return "Start my free 7-day trial";
		if (!activeProduct) return "Complete payment";
		return `Pay ${formatAmount(activeProduct.amountCents, activeProduct.currency)}`;
	})();

	const backHref = isUpgrade
		? ROUTES.dashboardBillingCompare
		: ROUTES.dashboardBilling;
	const backLabel = isUpgrade ? "← Back to compare plans" : "← Back to plans";

	const retryPublishableKey = async () => {
		setKeyRetrying(true);
		setBillingConfigError(null);
		try {
			const key = await convex.query(
				api.stripe.queries.getStripePublishableKey,
				{},
			);
			setRetriedPublishableKey(key);
			if (!key) {
				setBillingConfigError(
					"Payment setup is temporarily unavailable. Please try again shortly.",
				);
			}
		} catch (error) {
			setBillingConfigError(messageFromError(error));
		} finally {
			setKeyRetrying(false);
		}
	};

	if (
		publishableKeyFromServer === undefined ||
		products === undefined ||
		subscription === undefined
	) {
		return <PageLoader />;
	}

	if (!publishableKey) {
		return (
			<div className="relative flex min-h-svh w-full flex-col bg-secondary">
				<div className="mt-20 flex flex-1 flex-col items-center justify-center px-4 py-16">
					<div className="mx-auto flex w-full max-w-md flex-col items-center gap-4 rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
						<h1 className="font-semibold text-foreground text-xl">
							Billing unavailable
						</h1>
						<p className="text-muted-foreground text-sm leading-relaxed">
							We couldn&apos;t load payment settings right now. You can retry or
							return to billing to choose a plan later.
						</p>
						{billingConfigError ? (
							<p className="text-destructive text-sm">{billingConfigError}</p>
						) : null}
						<div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
							<Button
								type="button"
								className="h-11 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
								disabled={keyRetrying}
								onClick={() => void retryPublishableKey()}
							>
								{keyRetrying ? "Retrying…" : "Retry"}
							</Button>
							<Button
								type="button"
								variant="outline"
								className="h-11 rounded-xl"
								nativeButton={false}
								render={<Link to={backHref} />}
							>
								Go back
							</Button>
						</div>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="relative flex min-h-svh w-full flex-col bg-secondary">
			<div className="mt-20 flex flex-1 flex-col px-4 py-8 sm:px-6 md:px-10">
				<div className="mx-auto flex w-full max-w-[1040px] flex-col gap-8">
					<header className="flex flex-col gap-2">
						<Link to={backHref} className={checkoutBackLinkClass}>
							{backLabel}
						</Link>
						<h1 className="font-semibold text-3xl text-foreground">
							{isUpgrade ? "Upgrade checkout" : "Checkout"}
						</h1>
						<p className="text-muted-foreground text-sm">
							{isUpgrade
								? "Confirm your new plan and complete payment."
								: "Securely complete your subscription to Legacy Building."}
						</p>
					</header>

					<div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
						<CheckoutOrderSummary
							plan={plan}
							onPlanChange={handlePlanChange}
							monthlyProduct={monthlyProduct}
							annualProduct={annualProduct}
							hideTrial={isUpgrade}
						/>

						{!checkoutReady ? (
							<div className="flex min-h-[360px] flex-col justify-center gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
								<h2 className="font-semibold text-foreground text-xl">
									Ready to continue?
								</h2>
								<p className="text-muted-foreground text-sm leading-relaxed">
									Review your plan on the left. When you&apos;re ready, continue
									to securely enter your payment details. Nothing is charged
									until you complete the form.
								</p>
								<Button
									type="button"
									className="h-12 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
									onClick={() => setCheckoutReady(true)}
								>
									Continue to payment
								</Button>
							</div>
						) : initializing || !clientSecret || !stripePromise ? (
							<div className="flex min-h-[360px] items-center justify-center rounded-2xl border border-border bg-card">
								<PageLoader overlay={false} />
							</div>
						) : (
							<div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
								<CheckoutElementsProvider
									key={clientSecret}
									stripe={stripePromise}
									options={{
										clientSecret,
										elementsOptions: {
											appearance: {
												theme: "stripe",
												variables: {
													colorPrimary: brand.primary,
													borderRadius: "12px",
												},
											},
										},
									}}
								>
									<CheckoutPaymentForm amountLabel={payLabel} />
								</CheckoutElementsProvider>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
