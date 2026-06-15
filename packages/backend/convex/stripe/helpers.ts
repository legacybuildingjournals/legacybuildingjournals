import { ConvexError } from "convex/values";

import { components } from "../_generated/api";
import type { ActionCtx, QueryCtx } from "../_generated/server";

type CtxWithQuery = Pick<QueryCtx, "runQuery"> | Pick<ActionCtx, "runQuery">;

const CHECKOUT_SUCCESS_PATH =
	"/dashboard/billing/success?session_id={CHECKOUT_SESSION_ID}";

/** Resolve Stripe Checkout `return_url` from the client or Convex env. */
export function resolveCheckoutReturnUrl(returnUrl?: string): string {
	const fromClient = returnUrl?.trim();
	if (fromClient) return fromClient;

	const appOrigin = process.env.WEB_APP_URL?.replace(/\/$/, "");
	if (appOrigin) {
		return `${appOrigin}${CHECKOUT_SUCCESS_PATH}`;
	}

	throw new ConvexError({
		code: "CHECKOUT_FAILED",
		message: "Checkout return URL is missing. Refresh the page and try again.",
	});
}

export type ComponentSubscription = {
	stripeSubscriptionId: string;
	stripeCustomerId: string;
	status: string;
	priceId: string;
	quantity?: number;
	currentPeriodEnd: number;
	cancelAtPeriodEnd: boolean;
	cancelAt?: number;
	userId?: string;
};

/** Statuses we treat as a live subscription the user can manage/change. */
const MANAGEABLE_STATUSES = new Set(["active", "trialing", "past_due"]);

/** Statuses that unlock journal and other paid features. */
export const FEATURE_ACCESS_STATUSES = new Set([
	"active",
	"trialing",
	"past_due",
]);

/**
 * List synced Stripe subscriptions for a Clerk user. Falls back to the linked
 * customer record when the component index by userId is empty.
 */
export async function listSubscriptionsForClerkUser(
	ctx: CtxWithQuery,
	clerkUserId: string,
): Promise<ComponentSubscription[]> {
	const byUserId: ComponentSubscription[] = await ctx.runQuery(
		components.stripe.public.listSubscriptionsByUserId,
		{ userId: clerkUserId },
	);
	if (byUserId.length > 0) return byUserId;

	const customer = await ctx.runQuery(
		components.stripe.public.getCustomerByUserId,
		{ userId: clerkUserId },
	);
	if (!customer) return [];

	return ctx.runQuery(components.stripe.public.listSubscriptions, {
		stripeCustomerId: customer.stripeCustomerId,
	});
}

/**
 * Find the user's current manageable subscription (active, trialing, or past due),
 * reading from the Stripe component's synced tables. Returns `null` when none.
 */
export async function getActiveSubscriptionForUser(
	ctx: ActionCtx,
	clerkUserId: string,
): Promise<ComponentSubscription | null> {
	const subscriptions = await listSubscriptionsForClerkUser(ctx, clerkUserId);

	const manageable = subscriptions.filter((s) =>
		MANAGEABLE_STATUSES.has(s.status),
	);
	if (manageable.length === 0) return null;

	// Prefer the subscription with the furthest period end (the live one).
	return (
		manageable.sort((a, b) => b.currentPeriodEnd - a.currentPeriodEnd)[0] ??
		null
	);
}

/** Require the Stripe secret key from the Convex environment. */
export function requireStripeSecretKey(): string {
	const key = process.env.STRIPE_SECRET_KEY;
	if (!key) {
		throw new Error(
			"Billing is not configured. Set STRIPE_SECRET_KEY in your Convex environment variables.",
		);
	}
	return key;
}
