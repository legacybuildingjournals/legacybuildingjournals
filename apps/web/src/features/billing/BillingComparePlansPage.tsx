import { api } from "@legacy-building/backend/convex/_generated/api";
import { PageLoader } from "@legacy-building/ui/components/page-loader";
import { brand } from "@legacy-building/ui/lib/brand-journal";
import { cn } from "@legacy-building/ui/lib/utils";
import { Link, useNavigate } from "@tanstack/react-router";
import { useAction, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { Check, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
	billingPageShellClass,
	billingPageTitleClass,
} from "@/components/billing/billingLayoutStyles";
import type { BillingPlanChoice } from "@/lib/billing/billingContent";
import {
	BILLING_MANAGE_BG,
	BILLING_PLAN_ACTION_COPY,
} from "@/lib/billing/billingContent";
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

type ComparePlan = "monthly" | "annual";

export function BillingComparePlansPage() {
	const navigate = useNavigate();
	const subscription = useQuery(api.stripe.queries.getMySubscription);
	const products = useQuery(api.stripe.products.queries.listActive);
	const changePlan = useAction(api.stripe.actions.changePlan);

	const [selected, setSelected] = useState<ComparePlan>("annual");
	const [pending, setPending] = useState(false);

	// Apple/Google plans can only be changed in their store — never via Stripe.
	// Bounce IAP subscribers who reach this page (e.g. by direct URL) back to billing.
	useEffect(() => {
		if (subscription && subscription.provider !== "stripe") {
			void navigate({ to: ROUTES.dashboardBilling });
		}
	}, [subscription, navigate]);

	const monthlyProduct = products?.find((p) => p.interval === "monthly");
	const annualProduct = products?.find((p) => p.interval === "annual");

	const hasActiveSub =
		subscription &&
		(subscription.status === "active" ||
			subscription.status === "trialing" ||
			subscription.status === "past_due");

	const currentInterval = hasActiveSub ? subscription.interval : null;
	const isCurrent = (plan: ComparePlan) => currentInterval === plan;

	const handleContinue = async () => {
		if (pending || isCurrent(selected)) return;

		if (!hasActiveSub) {
			const checkoutPlan: BillingPlanChoice =
				selected === "annual" ? "annual" : "monthly";
			void navigate({
				to: ROUTES.dashboardBillingCheckout,
				search: { plan: checkoutPlan, flow: "subscribe" },
			});
			return;
		}

		if (currentInterval === "annual" && selected === "monthly") {
			setPending(true);
			try {
				const result = await changePlan({ targetInterval: "monthly" });
				if (result.effect === "scheduled" && result.effectiveAt) {
					const date = new Date(result.effectiveAt * 1000).toLocaleDateString(
						undefined,
						{ year: "numeric", month: "long", day: "numeric" },
					);
					toast.success(`Your plan switches to monthly on ${date}.`);
				} else {
					toast.success("Your plan has been updated.");
				}
				void navigate({ to: ROUTES.dashboardBilling });
			} catch (error) {
				toast.error(messageFromError(error));
			} finally {
				setPending(false);
			}
			return;
		}

		void navigate({
			to: ROUTES.dashboardBillingCheckout,
			search: { plan: selected, flow: "upgrade" },
		});
	};

	if (subscription === undefined || products === undefined) {
		return <PageLoader />;
	}

	const ctaLabel = (() => {
		if (isCurrent(selected)) return BILLING_PLAN_ACTION_COPY.currentPlan;
		if (!hasActiveSub) return BILLING_PLAN_ACTION_COPY.continueToCheckout;
		if (currentInterval === "annual" && selected === "monthly") {
			return BILLING_PLAN_ACTION_COPY.scheduleSwitchToMonthly;
		}
		return selected === "annual"
			? BILLING_PLAN_ACTION_COPY.switchToAnnual
			: BILLING_PLAN_ACTION_COPY.switchToMonthly;
	})();

	return (
		<div
			className="relative flex min-h-svh w-full flex-col"
			style={{ backgroundColor: BILLING_MANAGE_BG }}
		>
			<div className={billingPageShellClass}>
				<div className="mx-auto flex w-full max-w-[720px] flex-col gap-6 sm:gap-8">
					<header className="flex min-w-0 flex-col gap-2">
						<Link
							to={ROUTES.dashboardBilling}
							className="w-fit text-[#008080] text-sm hover:underline"
						>
							← Back to billing
						</Link>
						<h1 className={cn(billingPageTitleClass, "text-[#1a1a1a]")}>
							{BILLING_PLAN_ACTION_COPY.comparePlansTitle}
						</h1>
						<p className="text-[#525252] text-sm leading-relaxed sm:text-base">
							{BILLING_PLAN_ACTION_COPY.comparePlansSubtitle}
						</p>
					</header>

					<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
						{(["monthly", "annual"] as const).map((plan) => {
							const product =
								plan === "monthly" ? monthlyProduct : annualProduct;
							const selectedPlan = selected === plan;
							const current = isCurrent(plan);
							return (
								<button
									key={plan}
									type="button"
									onClick={() => setSelected(plan)}
									className={cn(
										"relative flex cursor-pointer flex-col gap-3 rounded-2xl border bg-white p-4 text-left shadow-sm transition-colors sm:p-5",
										selectedPlan
											? "border-[#008080] ring-2 ring-[#008080]/20"
											: "border-[#e6e6e6] hover:border-[#008080]/40",
									)}
								>
									{plan === "annual" ? (
										<span className="absolute top-3 right-3 rounded-full bg-[#22c55e] px-2 py-0.5 font-semibold text-[10px] text-white uppercase">
											Save 37%
										</span>
									) : null}
									<div className="flex items-center gap-2">
										<span
											className={cn(
												"flex size-5 items-center justify-center rounded-full border-2",
												selectedPlan
													? "border-[#008080] bg-[#008080]"
													: "border-[#c7c7c7]",
											)}
										>
											{selectedPlan ? (
												<span className="size-2 rounded-full bg-white" />
											) : null}
										</span>
										<span className="font-semibold text-[#1a1a1a] text-lg capitalize">
											{plan === "monthly" ? "Monthly Plan" : "Annual Plan"}
										</span>
									</div>
									<p className="font-semibold text-[#1a1a1a] text-[clamp(1.375rem,5vw,1.5rem)]">
										{product
											? formatAmount(product.amountCents, product.currency)
											: plan === "annual"
												? "$29.99"
												: "$3.99"}
										<span className="font-normal text-[#8a8a8a] text-base">
											{plan === "annual" ? " / year" : " / month"}
										</span>
									</p>
									{current ? (
										<span className="font-medium text-[#008080] text-xs">
											{BILLING_PLAN_ACTION_COPY.currentPlan}
										</span>
									) : null}
								</button>
							);
						})}
					</div>

					<ul className="flex flex-col gap-2 rounded-2xl border border-[#e6e6e6] bg-white p-4 sm:p-5">
						{[
							"Unlimited journal entries",
							"Voice recording",
							"PDF export",
							"Secure cloud backup",
						].map((feature) => (
							<li
								key={feature}
								className="flex items-center gap-2 text-[#1a1a1a] text-sm"
							>
								<Check
									className="size-4 shrink-0"
									style={{ color: brand.primary }}
									aria-hidden
								/>
								{feature}
							</li>
						))}
					</ul>

					<button
						type="button"
						onClick={() => void handleContinue()}
						disabled={pending || isCurrent(selected)}
						className="inline-flex h-12 items-center justify-center gap-2 rounded-xl font-semibold text-sm text-white hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
						style={{ backgroundColor: brand.primary }}
					>
						{pending ? (
							<>
								<Loader2 className="size-4 animate-spin" aria-hidden />
								Processing…
							</>
						) : (
							ctaLabel
						)}
					</button>
				</div>
			</div>
		</div>
	);
}
