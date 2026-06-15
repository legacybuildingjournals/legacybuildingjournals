import { components } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { userHasPaidFeatureAccess } from "../stripe/access";
import { listSubscriptionsForClerkUser } from "../stripe/helpers";

const LIVE_SUBSCRIPTION_STATUSES = new Set([
	"active",
	"trialing",
	"past_due",
	"unpaid",
]);

function statusRank(status: string): number {
	switch (status) {
		case "active":
		case "trialing":
			return 0;
		case "past_due":
		case "unpaid":
			return 1;
		default:
			return 2;
	}
}

type StripeComponentSubscription = {
	stripeSubscriptionId: string;
	stripeCustomerId: string;
	status: string;
	priceId: string;
	currentPeriodEnd: number;
	cancelAtPeriodEnd: boolean;
	cancelAt?: number;
};

export type AdminUserBillingDetail = {
	hasPaidFeatureAccess: boolean;
	hasPaidJournalAccessMirror: boolean;
	stripeCustomerId: string | null;
	stripeSubscriptionId: string | null;
	stripeStatus: string | null;
	cancelAtPeriodEnd: boolean;
	cancelAt: number | null;
	currentPeriodEnd: number | null;
	plan: {
		name: string;
		interval: "monthly" | "annual";
		amountCents: number;
		currency: string;
	} | null;
	pendingPlanChange: {
		interval: "monthly" | "annual";
		effectiveAt: number;
	} | null;
	mirroredSubscriptionStatus: NonNullable<
		Doc<"users">["subscriptionStatus"]
	> | null;
	betaAccess: boolean;
};

/** Mirror-only paid access (cheap; used in list views). */
export function mirroredPaidJournalAccess(
	user: Pick<Doc<"users">, "role" | "subscriptionStatus" | "betaAccess">,
): boolean {
	if (user.role === "admin") return true;
	if (user.betaAccess === true) return true;
	return (
		user.subscriptionStatus === "active" ||
		user.subscriptionStatus === "grace_period"
	);
}

export async function getAdminUserBillingDetail(
	ctx: QueryCtx,
	user: Doc<"users">,
): Promise<AdminUserBillingDetail> {
	const hasPaidFeatureAccess = await userHasPaidFeatureAccess(
		ctx,
		user.clerkId,
	);

	const subscriptions: StripeComponentSubscription[] =
		await listSubscriptionsForClerkUser(ctx, user.clerkId);

	const liveSubscriptions = subscriptions.filter((subscription) =>
		LIVE_SUBSCRIPTION_STATUSES.has(subscription.status),
	);
	const [subscription] = [...liveSubscriptions].sort(
		(a, b) =>
			statusRank(a.status) - statusRank(b.status) ||
			b.currentPeriodEnd - a.currentPeriodEnd,
	);

	let plan: AdminUserBillingDetail["plan"] = null;
	if (subscription) {
		const product = await ctx.db
			.query("products")
			.withIndex("by_stripe_price_id", (q) =>
				q.eq("stripePriceId", subscription.priceId),
			)
			.unique();
		if (product) {
			plan = {
				name: product.name,
				interval: product.interval,
				amountCents: product.amountCents,
				currency: product.currency,
			};
		}
	}

	const customer = await ctx.runQuery(
		components.stripe.public.getCustomerByUserId,
		{ userId: user.clerkId },
	);

	return {
		hasPaidFeatureAccess,
		hasPaidJournalAccessMirror: mirroredPaidJournalAccess(user),
		stripeCustomerId:
			user.stripeCustomerId ?? customer?.stripeCustomerId ?? null,
		stripeSubscriptionId: subscription?.stripeSubscriptionId ?? null,
		stripeStatus: subscription?.status ?? null,
		cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd ?? false,
		cancelAt: subscription?.cancelAt ?? null,
		currentPeriodEnd: subscription?.currentPeriodEnd ?? null,
		plan,
		pendingPlanChange: user.pendingPlanChange ?? null,
		mirroredSubscriptionStatus: user.subscriptionStatus ?? null,
		betaAccess: user.betaAccess === true,
	};
}
