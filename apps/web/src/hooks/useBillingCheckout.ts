import { api } from "@legacy-building/backend/convex/_generated/api";
import { useNavigate } from "@tanstack/react-router";
import { useAction, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import type { BillingPlanChoice } from "@/lib/billing/billingContent";
import { BILLING_SUBSCRIBE_COPY } from "@/lib/billing/billingContent";
import type { PlanInterval } from "@/lib/billing/plans";
import { ROUTES } from "@/lib/routes";

function messageFromError(error: unknown): string {
	if (error instanceof ConvexError) {
		const data = error.data as { message?: string } | string | undefined;
		if (typeof data === "string") return data;
		if (data?.message) return data.message;
	}
	return "Something went wrong. Please try again.";
}

function planChoiceToInterval(choice: BillingPlanChoice): PlanInterval {
	return choice === "annual" ? "annual" : "monthly";
}

export function useBillingCheckout() {
	const navigate = useNavigate();
	const products = useQuery(api.stripe.products.queries.listActive);
	const subscription = useQuery(api.stripe.queries.getMySubscription);
	const createPlanChangeCheckout = useAction(
		api.stripe.actions.createPlanChangeCheckout,
	);
	const changePlan = useAction(api.stripe.actions.changePlan);

	const [selected, setSelected] = useState<BillingPlanChoice | null>(null);
	const [pending, setPending] = useState(false);

	const currentInterval =
		subscription &&
		(subscription.status === "active" ||
			subscription.status === "trialing" ||
			subscription.status === "past_due")
			? subscription.interval
			: null;

	const hasActiveSub = currentInterval !== null;
	const isTrialing = subscription?.status === "trialing";

	const monthlyProduct = products?.find((p) => p.interval === "monthly");
	const annualProduct = products?.find((p) => p.interval === "annual");

	const billingReturnUrls = useCallback(() => {
		const origin = window.location.origin;
		return {
			successUrl: `${origin}${ROUTES.dashboardBillingSuccess}`,
			cancelUrl: `${origin}${ROUTES.dashboardBilling}?checkout=canceled`,
		};
	}, []);

	const isCurrentChoice = useCallback(
		(choice: BillingPlanChoice) => {
			if (!hasActiveSub) return false;
			if (choice === "annual") return currentInterval === "annual";
			if (choice === "monthly") {
				return currentInterval === "monthly" && !isTrialing;
			}
			return currentInterval === "monthly" && isTrialing;
		},
		[hasActiveSub, currentInterval, isTrialing],
	);

	const checkout = useCallback(async () => {
		if (!selected || pending || (hasActiveSub && isCurrentChoice(selected))) {
			return;
		}

		if (!hasActiveSub) {
			void navigate({
				to: ROUTES.dashboardBillingCheckout,
				search: { plan: selected, flow: "subscribe" },
			});
			return;
		}

		setPending(true);
		try {
			const interval = planChoiceToInterval(selected);

			if (isTrialing) {
				const { url } = await createPlanChangeCheckout({
					targetInterval: interval,
					...billingReturnUrls(),
				});
				window.location.href = url;
				return;
			}

			const result = await changePlan({ targetInterval: interval });
			if (result.effect === "scheduled" && result.effectiveAt) {
				const date = new Date(result.effectiveAt * 1000).toLocaleDateString(
					undefined,
					{
						year: "numeric",
						month: "short",
						day: "numeric",
					},
				);
				toast.success(`Your plan switches to ${interval} on ${date}.`);
			} else {
				toast.success(`You're now on the ${interval} plan.`);
			}
		} catch (error) {
			toast.error(messageFromError(error));
		} finally {
			setPending(false);
		}
	}, [
		pending,
		isCurrentChoice,
		selected,
		hasActiveSub,
		isTrialing,
		createPlanChangeCheckout,
		billingReturnUrls,
		changePlan,
		navigate,
	]);

	const ctaLabel = (() => {
		if (!selected) return "Select a plan to continue";
		if (isCurrentChoice(selected)) return "Current plan";
		if (hasActiveSub && isTrialing) {
			return selected === "annual"
				? "Continue to payment"
				: "Continue to checkout";
		}
		if (hasActiveSub) {
			return selected === "annual" ? "Switch to annual" : "Switch to monthly";
		}
		if (selected === "trial") return BILLING_SUBSCRIBE_COPY.startTrialCta;
		if (selected === "annual") return "Continue with annual";
		return "Continue with monthly";
	})();

	return {
		products,
		subscription,
		monthlyProduct,
		annualProduct,
		selected,
		setSelected,
		pending,
		hasActiveSub,
		isTrialing,
		isCurrentChoice,
		checkout,
		ctaLabel,
		isLoading: products === undefined || subscription === undefined,
	};
}
