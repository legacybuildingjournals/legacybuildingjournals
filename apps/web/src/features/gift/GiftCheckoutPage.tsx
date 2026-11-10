import { api } from "@legacy-building/backend/convex/_generated/api";
import type { Id } from "@legacy-building/backend/convex/_generated/dataModel";
import { PageLoader } from "@legacy-building/ui/components/page-loader";
import { brand } from "@legacy-building/ui/lib/brand-journal";
import { CheckoutElementsProvider } from "@stripe/react-stripe-js/checkout";
import { loadStripe } from "@stripe/stripe-js";
import { Link, useNavigate } from "@tanstack/react-router";
import { useAction, useQuery } from "convex/react";
import { Gift } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { CheckoutPaymentForm } from "@/components/billing/CheckoutPaymentForm";
import {
	GiftPageChrome,
	giftCardClass,
	giftPrimaryButtonClass,
} from "@/components/gift/GiftPageChrome";
import { formatAmount } from "@/lib/billing/plans";
import { messageFromUnknownError } from "@/lib/journal/toast";
import { ROUTES } from "@/lib/routes";

/**
 * SST-4 (web): one-time Stripe Embedded Checkout for a saved gift draft.
 * Payment is confirmed server-side (webhook + return-page check); this page
 * only collects it. Going back keeps the draft (SST-3).
 */
export function GiftCheckoutPage({ giftId }: { giftId?: string }) {
	const navigate = useNavigate();
	const publishableKey = useQuery(api.stripe.queries.getStripePublishableKey);
	const offer = useQuery(api.gifts.queries.getOffer);
	const draft = useQuery(
		api.gifts.queries.getDraft,
		giftId ? { giftId: giftId as Id<"gifts"> } : "skip",
	);
	const createCheckout = useAction(api.gifts.actions.createCheckout);

	const [clientSecret, setClientSecret] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const startedRef = useRef(false);

	const stripePromise = useMemo(
		() => (publishableKey ? loadStripe(publishableKey) : null),
		[publishableKey],
	);

	const detailsHref = `${ROUTES.dashboardGiftDetails}?giftId=${giftId ?? ""}`;

	useEffect(() => {
		if (!giftId || !draft || draft.status !== "pending_payment") return;
		if (startedRef.current) return;
		startedRef.current = true;
		const returnUrl = `${window.location.origin}${ROUTES.dashboardGiftSuccess}?giftId=${giftId}&session_id={CHECKOUT_SESSION_ID}`;
		createCheckout({ giftId: giftId as Id<"gifts">, returnUrl })
			.then((result) => setClientSecret(result.clientSecret))
			.catch((err: unknown) => {
				startedRef.current = false;
				setError(
					messageFromUnknownError(err, "Could not start checkout. Try again."),
				);
			});
	}, [createCheckout, draft, giftId]);

	// Already paid (e.g. back button after paying): go to the success page.
	useEffect(() => {
		if (draft && draft.status !== "pending_payment") {
			void navigate({
				to: ROUTES.dashboardGiftSuccess,
				search: { giftId, session_id: undefined },
				replace: true,
			});
		}
	}, [draft, giftId, navigate]);

	if (!giftId || draft === null) {
		return (
			<GiftPageChrome title="Checkout" backTo={ROUTES.dashboardGift}>
				<div className={giftCardClass}>
					<p className="text-foreground text-sm">
						We couldn&apos;t find that gift. Start again from the gift page.
					</p>
					<Link
						to={ROUTES.dashboardGift}
						className={`${giftPrimaryButtonClass} mt-4`}
					>
						Start again
					</Link>
				</div>
			</GiftPageChrome>
		);
	}

	if (
		draft === undefined ||
		offer === undefined ||
		publishableKey === undefined
	) {
		return <PageLoader />;
	}

	const amountLabel = `Pay ${formatAmount(offer.priceMinor, offer.currency)}`;

	return (
		<GiftPageChrome title="Checkout" backTo={detailsHref} backLabel="Edit gift">
			<section className={giftCardClass}>
				<div className="flex items-start gap-3">
					<span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
						<Gift className="size-5" aria-hidden />
					</span>
					<div className="min-w-0 flex-1">
						<p className="font-semibold text-foreground">
							Lifetime Access Gift
						</p>
						<p className="truncate text-muted-foreground text-sm">
							For {draft.recipientName} ({draft.recipientEmail})
						</p>
						<p className="truncate text-muted-foreground text-sm">
							&ldquo;{draft.title}&rdquo;
						</p>
					</div>
					<p className="font-semibold text-foreground">
						{formatAmount(offer.priceMinor, offer.currency)}
					</p>
				</div>
				<p className="mt-3 text-muted-foreground text-xs">
					Shown in USD. Stripe may show and charge the equivalent in your local
					currency.
				</p>
			</section>

			<section className={giftCardClass}>
				{error ? (
					<div className="flex flex-col gap-3">
						<p className="text-destructive text-sm" role="alert">
							{error}
						</p>
						<Link to={detailsHref} className={giftPrimaryButtonClass}>
							Back to gift details
						</Link>
					</div>
				) : !publishableKey ? (
					<p className="text-muted-foreground text-sm">
						Payments are temporarily unavailable. Please try again shortly.
					</p>
				) : !clientSecret || !stripePromise ? (
					<div className="flex min-h-[240px] items-center justify-center">
						<PageLoader overlay={false} />
					</div>
				) : (
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
						<CheckoutPaymentForm amountLabel={amountLabel} allowWallets />
					</CheckoutElementsProvider>
				)}
			</section>
		</GiftPageChrome>
	);
}
