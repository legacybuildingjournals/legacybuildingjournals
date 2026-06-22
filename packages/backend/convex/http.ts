import { verifyWebhook } from "@clerk/backend/webhooks";
import { registerRoutes } from "@convex-dev/stripe";
import type { GenericActionCtx, GenericDataModel } from "convex/server";
import { httpRouter } from "convex/server";
import type Stripe from "stripe";
import { components, internal } from "./_generated/api";
import { httpAction } from "./_generated/server";
import type { ClerkUser } from "./helpers";
import {
	getEmailAndName,
	getInitialNameFromClerk,
	roleFromClerkMetadata,
	storeClerkProfilePicture,
} from "./helpers";
import {
	eventToStatus,
	isTrialPeriod,
	normalizeEnvironment,
	productToInterval,
	storeToProvider,
} from "./revenuecat/helpers";

const handleClerkWebhook = httpAction(async (ctx, request) => {
	if (request.method !== "POST") {
		return new Response("Method not allowed", { status: 405 });
	}
	const signingSecret = process.env.CLERK_WEBHOOK_SECRET;
	if (!signingSecret) {
		console.error(
			"Missing CLERK_WEBHOOK_SECRET in Convex environment variables.",
		);
		return new Response("Webhook signing secret not configured", {
			status: 500,
		});
	}

	let event: Awaited<ReturnType<typeof verifyWebhook>>;
	try {
		event = await verifyWebhook(request, { signingSecret });
	} catch (err) {
		console.error("Clerk webhook verification failed:", err);
		return new Response("Webhook verification failed", { status: 400 });
	}

	try {
		switch (event.type) {
			case "user.created":
			case "user.updated": {
				const clerkUser = event.data as ClerkUser;
				const { email } = getEmailAndName(clerkUser);
				if (!email) {
					console.warn("Clerk user webhook missing email:", clerkUser.id);
					break;
				}

				const name = getInitialNameFromClerk(clerkUser);

				const profilePictureId = await storeClerkProfilePicture(
					ctx,
					clerkUser.image_url,
				);

				await ctx.runMutation(internal.user.mutations.createOrUpdateFromClerk, {
					clerkId: clerkUser.id,
					email,
					name,
					profilePictureId,
					initialRole: roleFromClerkMetadata(clerkUser),
				});
				break;
			}
			case "user.deleted": {
				const id = (event.data as { id?: string })?.id;
				if (!id) {
					console.warn("user.deleted webhook missing id");
					break;
				}
				await ctx.runAction(internal.user.deleteAccount.purgeClerkUserById, {
					clerkId: id,
				});
				break;
			}
			default:
				console.log("Ignored Clerk webhook event:", event.type);
		}
	} catch (err) {
		console.error("Clerk webhook handler failed:", err);
		return new Response("Webhook handler failed", { status: 500 });
	}

	return new Response(null, { status: 200 });
});

/**
 * RevenueCat webhook → mirror Apple/Google subscription state into our
 * `subscriptions` table so the web app & backend know the user's provider
 * (and can route "manage in App Store/Play" vs Stripe correctly).
 * Auth: RevenueCat sends a fixed `Authorization` header we configure in the
 * dashboard; it must match REVENUECAT_WEBHOOK_SECRET.
 */
const handleRevenueCatWebhook = httpAction(async (ctx, request) => {
	if (request.method !== "POST") {
		return new Response("Method not allowed", { status: 405 });
	}

	const secret = process.env.REVENUECAT_WEBHOOK_SECRET;
	if (!secret) {
		console.error("Missing REVENUECAT_WEBHOOK_SECRET in Convex env vars.");
		return new Response("Webhook secret not configured", { status: 500 });
	}
	if (request.headers.get("Authorization") !== secret) {
		return new Response("Unauthorized", { status: 401 });
	}

	let body: { event?: Record<string, unknown> };
	try {
		body = await request.json();
	} catch {
		return new Response("Invalid JSON", { status: 400 });
	}

	const event = body?.event;
	if (!event) return new Response("Missing event", { status: 400 });

	const provider = storeToProvider(event.store);
	const status = eventToStatus(event.type, event.period_type);
	const appUserId = event.app_user_id;

	// Ignore events we don't track (unknown store, TEST/TRANSFER, or missing user).
	if (!provider || !status || typeof appUserId !== "string") {
		return new Response(null, { status: 200 });
	}

	try {
		await ctx.runMutation(internal.revenuecat.mutations.upsertFromWebhook, {
			appUserId,
			provider,
			status,
			interval: productToInterval(event.product_id),
			storeProductId:
				typeof event.product_id === "string" ? event.product_id : "unknown",
			currentPeriodEnd:
				typeof event.expiration_at_ms === "number"
					? event.expiration_at_ms
					: undefined,
			willRenew: status === "active" || status === "trialing",
			isTrial: isTrialPeriod(event.period_type),
			environment: normalizeEnvironment(event.environment),
		});
	} catch (err) {
		console.error("RevenueCat webhook handler failed:", err);
		return new Response("Webhook handler failed", { status: 500 });
	}

	return new Response(null, { status: 200 });
});

const http = httpRouter();

http.route({
	path: "/clerk/register",
	method: "POST",
	handler: handleClerkWebhook,
});

http.route({
	path: "/revenuecat/webhook",
	method: "POST",
	handler: handleRevenueCatWebhook,
});

/**
 * Mirror the authoritative subscription status (already synced into the Stripe
 * component's tables) onto our `users` table so the UI/access gates can read it
 * cheaply. Runs after the component's default sync.
 *
 * Also schedules the day-5 trial reminder email when a trialing subscription is
 * created, and cancels it (via mirrorSubscriptionStatus) when the user converts.
 */
async function mirrorSubscriptionEvent(
	ctx: GenericActionCtx<GenericDataModel>,
	event:
		| Stripe.CustomerSubscriptionCreatedEvent
		| Stripe.CustomerSubscriptionUpdatedEvent
		| Stripe.CustomerSubscriptionDeletedEvent,
) {
	const subscription = event.data.object;
	const userId =
		typeof subscription.metadata?.userId === "string"
			? subscription.metadata.userId
			: undefined;
	const stripeCustomerId =
		typeof subscription.customer === "string"
			? subscription.customer
			: subscription.customer?.id;
	const stripeStatus =
		event.type === "customer.subscription.deleted"
			? "canceled"
			: subscription.status;

	await ctx.runMutation(internal.stripe.mutations.mirrorSubscriptionStatus, {
		clerkUserId: userId,
		stripeCustomerId,
		stripeStatus,
	});

	// Schedule the day-5 reminder when a trial starts
	if (
		event.type === "customer.subscription.created" &&
		subscription.status === "trialing" &&
		subscription.trial_end &&
		userId
	) {
		await ctx.runMutation(internal.email.mutations.scheduleTrialReminder, {
			clerkUserId: userId,
			trialEndSeconds: subscription.trial_end,
		});
	}
}

// Stripe webhook handler at /stripe/webhook (signature verified by the component).
registerRoutes(http, components.stripe, {
	webhookPath: "/stripe/webhook",
	events: {
		"customer.subscription.created": mirrorSubscriptionEvent,
		"customer.subscription.updated": mirrorSubscriptionEvent,
		"customer.subscription.deleted": mirrorSubscriptionEvent,
	},
});

export default http;
