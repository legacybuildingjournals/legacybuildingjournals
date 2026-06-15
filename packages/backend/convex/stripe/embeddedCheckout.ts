import { ConvexError } from "convex/values";
import type Stripe from "stripe";

import type { Doc } from "../_generated/dataModel";

/** Checkout accepts card and ACH only — no buy-now-pay-later (e.g. Klarna). */
export const CHECKOUT_PAYMENT_METHOD_TYPES = [
	"card",
	"us_bank_account",
] as const satisfies readonly Stripe.Checkout.SessionCreateParams.PaymentMethodType[];

export type EmbeddedCheckoutSessionResult = {
	clientSecret: string;
};

/** Stripe API requires `elements`; Convex's bundled stripe@20 types only list `custom`. */
function elementsCheckoutSession(
	params: Stripe.Checkout.SessionCreateParams,
): Stripe.Checkout.SessionCreateParams {
	return params;
}

export async function expireOpenCheckoutSessions(
	stripe: Stripe,
	customerId: string,
): Promise<void> {
	const sessions = await stripe.checkout.sessions.list({
		customer: customerId,
		limit: 20,
	});

	await Promise.all(
		sessions.data
			.filter((session) => session.status === "open")
			.map((session) => stripe.checkout.sessions.expire(session.id)),
	);
}

export async function createSubscriptionEmbeddedCheckoutSession(
	stripe: Stripe,
	args: {
		customerId: string;
		userId: string;
		product: Doc<"products">;
		applyTrial: boolean;
		returnUrl: string;
	},
): Promise<EmbeddedCheckoutSessionResult> {
	await expireOpenCheckoutSessions(stripe, args.customerId);

	const session = await stripe.checkout.sessions.create(
		elementsCheckoutSession({
			ui_mode: "elements",
			mode: "subscription",
			customer: args.customerId,
			line_items: [{ price: args.product.stripePriceId, quantity: 1 }],
			return_url: args.returnUrl,
			allow_promotion_codes: true,
			payment_method_types: [...CHECKOUT_PAYMENT_METHOD_TYPES],
			metadata: { userId: args.userId },
			subscription_data: {
				metadata: { userId: args.userId },
				...(args.applyTrial
					? { trial_period_days: args.product.trialDays }
					: {}),
			},
		} as unknown as Stripe.Checkout.SessionCreateParams),
	);

	if (!session.client_secret) {
		throw new ConvexError({
			code: "CHECKOUT_FAILED",
			message: "Could not start checkout. Please try again.",
		});
	}

	return { clientSecret: session.client_secret };
}

export async function createProrationPaymentCheckoutSession(
	stripe: Stripe,
	args: {
		customerId: string;
		userId: string;
		invoice: Stripe.Invoice;
		returnUrl: string;
	},
): Promise<EmbeddedCheckoutSessionResult> {
	await expireOpenCheckoutSessions(stripe, args.customerId);

	const session = await stripe.checkout.sessions.create(
		elementsCheckoutSession({
			ui_mode: "elements",
			mode: "payment",
			customer: args.customerId,
			line_items: [
				{
					price_data: {
						currency: args.invoice.currency,
						unit_amount: args.invoice.amount_due,
						product_data: { name: "Plan change" },
					},
					quantity: 1,
				},
			],
			return_url: args.returnUrl,
			allow_promotion_codes: true,
			payment_method_types: [...CHECKOUT_PAYMENT_METHOD_TYPES],
			metadata: {
				userId: args.userId,
				stripeInvoiceId: args.invoice.id,
			},
		} as unknown as Stripe.Checkout.SessionCreateParams),
	);

	if (!session.client_secret) {
		throw new ConvexError({
			code: "CHECKOUT_FAILED",
			message: "Could not start payment checkout. Please try again.",
		});
	}

	return { clientSecret: session.client_secret };
}

export async function findResumableCheckoutSession(
	stripe: Stripe,
	args: {
		customerId: string;
		stripePriceId?: string;
	},
): Promise<EmbeddedCheckoutSessionResult | null> {
	const sessions = await stripe.checkout.sessions.list({
		customer: args.customerId,
		limit: 10,
		expand: ["data.line_items"],
	});

	for (const session of sessions.data) {
		if (session.status !== "open" || !session.client_secret) continue;
		// Skip legacy `custom` sessions — Stripe now requires `elements`.
		// Stripe removed `custom` from UiMode typings; still filter legacy sessions.
		if ((session.ui_mode as string | null) === "custom") continue;

		if (args.stripePriceId) {
			const lineItems = session.line_items?.data ?? [];
			const matchesPrice = lineItems.some(
				(item) => item.price?.id === args.stripePriceId,
			);
			if (!matchesPrice) continue;
		}

		return { clientSecret: session.client_secret };
	}

	return null;
}

export function subscriptionLatestInvoiceId(
	subscription: Stripe.Subscription,
): string | null {
	const invoice = subscription.latest_invoice;
	if (!invoice) return null;
	return typeof invoice === "string" ? invoice : invoice.id;
}
