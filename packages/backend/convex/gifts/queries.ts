import { v } from "convex/values";

import { internalQuery, query } from "../_generated/server";
import { getActiveIapSubscription } from "../subscriptions/helpers";
import {
	GIFT_BASE_CURRENCY,
	GIFT_BASE_PRICE_MINOR,
	GIFT_LIMITS,
	getUserByClerkId,
	giftDisplayStatus,
	maskEmail,
	normalizeEmail,
	userHasLifetime,
} from "./helpers";

const displayStatusValidator = v.union(
	v.literal("pending_payment"),
	v.literal("paid"),
	v.literal("redeemed"),
	v.literal("expired"),
	v.literal("refunded"),
);

/** Price + purchaser details for the Gift Subscription / Gift Invite screens. */
export const getOffer = query({
	args: {},
	returns: v.object({
		priceMinor: v.number(),
		currency: v.string(),
		limits: v.object({
			nameMax: v.number(),
			titleMax: v.number(),
			messageMax: v.number(),
		}),
		purchaser: v.union(
			v.null(),
			v.object({ name: v.string(), email: v.string() }),
		),
	}),
	handler: async (ctx) => {
		const identity = await ctx.auth.getUserIdentity();
		const user = identity
			? await getUserByClerkId(ctx, identity.subject)
			: null;
		return {
			priceMinor: GIFT_BASE_PRICE_MINOR,
			currency: GIFT_BASE_CURRENCY,
			limits: { ...GIFT_LIMITS },
			purchaser: user ? { name: user.name, email: user.email } : null,
		};
	},
});

/** A draft the purchaser is still editing (restored after a failed payment). */
export const getDraft = query({
	args: { giftId: v.id("gifts") },
	returns: v.union(
		v.null(),
		v.object({
			_id: v.id("gifts"),
			recipientName: v.string(),
			recipientEmail: v.string(),
			title: v.string(),
			message: v.string(),
			status: displayStatusValidator,
		}),
	),
	handler: async (ctx, { giftId }) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) return null;
		const gift = await ctx.db.get(giftId);
		if (!gift || gift.purchaserId !== identity.subject) return null;
		return {
			_id: gift._id,
			recipientName: gift.recipientName,
			recipientEmail: gift.recipientEmail,
			title: gift.title,
			message: gift.message,
			status: giftDisplayStatus(gift, Date.now()),
		};
	},
});

/** The purchaser's gift history (Account → Gift & Invite). Paid gifts only. */
export const listMine = query({
	args: {},
	returns: v.array(
		v.object({
			_id: v.id("gifts"),
			recipientName: v.string(),
			recipientEmail: v.string(),
			title: v.string(),
			status: displayStatusValidator,
			paidAt: v.union(v.number(), v.null()),
			redeemedAt: v.union(v.number(), v.null()),
			expiresAt: v.union(v.number(), v.null()),
			cardUrl: v.union(v.string(), v.null()),
		}),
	),
	handler: async (ctx) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) return [];
		const gifts = await ctx.db
			.query("gifts")
			.withIndex("by_purchaser", (q) => q.eq("purchaserId", identity.subject))
			.order("desc")
			.take(100);
		const now = Date.now();
		return await Promise.all(
			gifts
				.filter((gift) => gift.status !== "pending_payment")
				.map(async (gift) => ({
					_id: gift._id,
					recipientName: gift.recipientName,
					recipientEmail: gift.recipientEmail,
					title: gift.title,
					status: giftDisplayStatus(gift, now),
					paidAt: gift.paidAt ?? null,
					redeemedAt: gift.redeemedAt ?? null,
					expiresAt: gift.expiresAt ?? null,
					cardUrl: gift.cardImageId
						? await ctx.storage.getUrl(gift.cardImageId)
						: null,
				})),
		);
	},
});

/**
 * Public: what the redeem page (`/gift/<token>`) needs. Anyone holding the
 * token can see the gift's basics. The token is the secret, and the page must
 * show the recipient email (greyed out) on the sign-up form.
 */
export const getRedeemInfo = query({
	args: { token: v.string() },
	returns: v.union(
		v.null(),
		v.object({
			status: displayStatusValidator,
			recipientName: v.string(),
			recipientEmail: v.string(),
			maskedRecipientEmail: v.string(),
			purchaserName: v.string(),
			title: v.string(),
			message: v.string(),
			hasAccountForEmail: v.boolean(),
			viewer: v.union(
				v.null(),
				v.object({
					email: v.string(),
					emailMatches: v.boolean(),
					hasLifetime: v.boolean(),
				}),
			),
		}),
	),
	handler: async (ctx, { token }) => {
		if (!token.trim()) return null;
		const gift = await ctx.db
			.query("gifts")
			.withIndex("by_redeem_token", (q) => q.eq("redeemToken", token))
			.unique();
		if (!gift) return null;

		const identity = await ctx.auth.getUserIdentity();
		const viewerUser = identity
			? await getUserByClerkId(ctx, identity.subject)
			: null;
		const viewerEmail = viewerUser?.email ?? identity?.email ?? null;

		const accountForEmail = await ctx.db
			.query("users")
			.withIndex("by_email", (q) => q.eq("email", gift.recipientEmail))
			.first();

		return {
			status: giftDisplayStatus(gift, Date.now()),
			recipientName: gift.recipientName,
			recipientEmail: gift.recipientEmail,
			maskedRecipientEmail: maskEmail(gift.recipientEmail),
			purchaserName: gift.purchaserName,
			title: gift.title,
			message: gift.message,
			hasAccountForEmail: accountForEmail !== null,
			viewer: viewerEmail
				? {
						email: viewerEmail,
						emailMatches: normalizeEmail(viewerEmail) === gift.recipientEmail,
						hasLifetime: userHasLifetime(viewerUser),
					}
				: null,
		};
	},
});

/**
 * Lifetime state for the signed-in user. Drives the "cancel your store
 * subscription" splash: lifetime makes a store subscription redundant, and
 * Apple/Google only let the user cancel it themselves.
 */
export const myLifetimeStatus = query({
	args: {},
	returns: v.object({
		hasLifetime: v.boolean(),
		storeSubscriptionToCancel: v.union(
			v.literal("app_store"),
			v.literal("play_store"),
			v.null(),
		),
	}),
	handler: async (ctx) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity)
			return { hasLifetime: false, storeSubscriptionToCancel: null };
		const user = await getUserByClerkId(ctx, identity.subject);
		if (!userHasLifetime(user)) {
			return { hasLifetime: false, storeSubscriptionToCancel: null };
		}
		const iap = await getActiveIapSubscription(ctx, identity.subject, {
			productionOnly: false,
		});
		const renewing = iap && iap.willRenew !== false;
		return {
			hasLifetime: true,
			storeSubscriptionToCancel: renewing
				? iap.provider === "apple"
					? ("app_store" as const)
					: ("play_store" as const)
				: null,
		};
	},
});

/**
 * The purchaser's most recent draft with a store purchase in flight: the
 * RevenueCat webhook's way to match a store transaction to a gift.
 */
export const findStoreCheckoutGift = internalQuery({
	args: { purchaserId: v.string() },
	handler: async (ctx, { purchaserId }) => {
		const drafts = await ctx.db
			.query("gifts")
			.withIndex("by_purchaser", (q) => q.eq("purchaserId", purchaserId))
			.order("desc")
			.take(20);
		return (
			drafts
				.filter(
					(gift) =>
						gift.status === "pending_payment" &&
						gift.storeCheckoutStartedAt !== undefined,
				)
				.sort(
					(a, b) =>
						(b.storeCheckoutStartedAt ?? 0) - (a.storeCheckoutStartedAt ?? 0),
				)[0] ?? null
		);
	},
});

/** Everything the delivery action needs, in one read. */
export const getForDelivery = internalQuery({
	args: { giftId: v.id("gifts") },
	handler: async (ctx, { giftId }) => {
		return await ctx.db.get(giftId);
	},
});
