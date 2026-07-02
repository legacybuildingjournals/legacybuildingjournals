import { ConvexError, v } from "convex/values";

import { internal } from "../_generated/api";
import { action, internalAction } from "../_generated/server";
import { mapSubscriberResponse, type RcSubscriber } from "./helpers";

const RC_API_BASE = "https://api.revenuecat.com/v1";

/**
 * Fetch a subscriber's *current* entitlement from RevenueCat's REST API and
 * mirror it into our `subscriptions` table.
 *
 * This is the authoritative re-sync path used when no usable webhook event is
 * delivered — chiefly a restore/transfer (RevenueCat emits a `TRANSFER`, which
 * carries no product/expiry detail). Reading from RevenueCat's API with the
 * secret key (rather than trusting the client's word) keeps the server
 * authoritative about who is Pro.
 *
 * Internal only — reached via the TRANSFER webhook (gaining side) and the
 * public `syncMySubscription` action below.
 */
export const syncSubscriber = internalAction({
	args: { appUserId: v.string() },
	handler: async (ctx, { appUserId }): Promise<void> => {
		// Anonymous ids can't be mapped to a user — nothing to sync.
		if (appUserId.startsWith("$RCAnonymousID")) return;

		const apiKey = process.env.REVENUECAT_REST_API_KEY;
		if (!apiKey) {
			console.error(
				"Missing REVENUECAT_REST_API_KEY in Convex env — cannot sync subscriber from RevenueCat.",
			);
			return;
		}

		const res = await fetch(
			`${RC_API_BASE}/subscribers/${encodeURIComponent(appUserId)}`,
			{ headers: { Authorization: `Bearer ${apiKey}` } },
		);

		// 404 = RevenueCat has never seen this user → ensure no stale access.
		if (res.status === 404) {
			await ctx.runMutation(internal.revenuecat.mutations.expireByAppUserId, {
				appUserId,
			});
			return;
		}

		if (!res.ok) {
			throw new Error(
				`RevenueCat API ${res.status} for ${appUserId}: ${await res.text()}`,
			);
		}

		const body = (await res.json()) as { subscriber?: RcSubscriber };
		const mapped = body.subscriber
			? mapSubscriberResponse(body.subscriber)
			: null;

		if (!mapped) {
			// No active entitlement → expire any row we still hold.
			await ctx.runMutation(internal.revenuecat.mutations.expireByAppUserId, {
				appUserId,
			});
			return;
		}

		await ctx.runMutation(internal.revenuecat.mutations.upsertFromWebhook, {
			appUserId,
			provider: mapped.provider,
			status: mapped.status,
			interval: mapped.interval,
			storeProductId: mapped.storeProductId,
			currentPeriodEnd: mapped.currentPeriodEnd,
			willRenew: mapped.willRenew,
			isTrial: mapped.isTrial,
			// `environment` isn't reported by this endpoint — leave it unchanged.
		});
	},
});

/**
 * Client-callable: re-sync the signed-in user's subscription from RevenueCat.
 *
 * Called right after a successful restore so Convex reflects a transferred
 * subscription immediately, without waiting on webhook delivery. The losing
 * (old) account is expired by the TRANSFER webhook — the client can't know its
 * id, so that side is server-only.
 */
export const syncMySubscription = action({
	args: {},
	handler: async (ctx): Promise<{ synced: boolean }> => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new ConvexError({
				code: "UNAUTHENTICATED",
				message: "You must be signed in to sync your subscription.",
			});
		}

		// `Purchases.logIn(clerkId)` makes the RevenueCat app_user_id == Clerk id.
		await ctx.runAction(internal.revenuecat.actions.syncSubscriber, {
			appUserId: identity.subject,
		});

		return { synced: true };
	},
});
