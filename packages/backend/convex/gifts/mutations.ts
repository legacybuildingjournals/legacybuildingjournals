import { ConvexError, v } from "convex/values";

import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { internalMutation, mutation } from "../_generated/server";
import { requireClerkUserId } from "../journal/auth";
import { getActiveIapSubscription } from "../subscriptions/helpers";
import {
	GIFT_LIMITS,
	GIFT_VALIDITY_MS,
	getUserByClerkId,
	getUsersByEmail,
	giftDisplayStatus,
	isValidEmail,
	normalizeEmail,
	userHasLifetime,
} from "./helpers";

function fail(code: string, message: string): never {
	throw new ConvexError({ code, message });
}

/**
 * Create or update the purchaser's gift draft. Called before checkout so the
 * details survive a failed or cancelled payment (SST-3); the same draft id is
 * reused on retry. Purchaser name/email always come from the account.
 */
export const saveDraft = mutation({
	args: {
		giftId: v.optional(v.id("gifts")),
		recipientName: v.string(),
		recipientEmail: v.string(),
		title: v.string(),
		message: v.string(),
	},
	returns: v.id("gifts"),
	handler: async (ctx, args): Promise<Id<"gifts">> => {
		const userId = await requireClerkUserId(ctx);
		const purchaser = await getUserByClerkId(ctx, userId);
		if (!purchaser) {
			fail("NOT_FOUND", "We couldn't load your account. Please try again.");
		}

		const recipientName = args.recipientName.trim();
		const recipientEmail = normalizeEmail(args.recipientEmail);
		const title = args.title.trim();
		const message = args.message.trim();

		if (!recipientName) fail("INVALID", "Enter the recipient's name.");
		if (recipientName.length > GIFT_LIMITS.nameMax) {
			fail("INVALID", "The recipient's name is too long.");
		}
		if (!isValidEmail(recipientEmail)) {
			fail("INVALID", "Enter a valid email address for the recipient.");
		}
		if (!title) fail("INVALID", "Add a title for your gift.");
		if (title.length > GIFT_LIMITS.titleMax) {
			fail("INVALID", "The gift title is too long.");
		}
		if (message.length > GIFT_LIMITS.messageMax) {
			fail(
				"INVALID",
				`Keep your message under ${GIFT_LIMITS.messageMax} characters.`,
			);
		}
		if (recipientEmail === normalizeEmail(purchaser.email)) {
			fail("SELF_GIFT", "You can't send a gift to your own email address.");
		}

		const recipients = await getUsersByEmail(ctx, recipientEmail);
		if (recipients.some(userHasLifetime)) {
			fail(
				"ALREADY_LIFETIME",
				"This person already has lifetime access to Legacy Building.",
			);
		}

		const now = Date.now();
		const fields = {
			recipientName,
			recipientEmail,
			title,
			message,
			purchaserName: purchaser.name,
			purchaserEmail: purchaser.email,
			updatedAt: now,
		};

		if (args.giftId) {
			const existing = await ctx.db.get(args.giftId);
			if (
				existing &&
				existing.purchaserId === userId &&
				existing.status === "pending_payment"
			) {
				await ctx.db.patch(existing._id, fields);
				return existing._id;
			}
		}

		return await ctx.db.insert("gifts", {
			...fields,
			purchaserId: userId,
			status: "pending_payment",
			createdAt: now,
		});
	},
});

/**
 * Mark a draft as being paid through the App Store / Google Play, right before
 * the native app opens the store purchase sheet.
 */
export const startStoreCheckout = mutation({
	args: { giftId: v.id("gifts") },
	returns: v.null(),
	handler: async (ctx, { giftId }) => {
		const userId = await requireClerkUserId(ctx);
		const gift = await ctx.db.get(giftId);
		if (!gift || gift.purchaserId !== userId) {
			fail("NOT_FOUND", "We couldn't find that gift. Please start again.");
		}
		if (gift.status !== "pending_payment") {
			fail("ALREADY_PAID", "This gift has already been paid for.");
		}
		await ctx.db.patch(giftId, {
			storeCheckoutStartedAt: Date.now(),
			updatedAt: Date.now(),
		});
		return null;
	},
});

/**
 * Redeem a gift for the signed-in user (SST-7). The account's email must match
 * the gift's recipient email; the client calls `user.mutations.ensureCurrentUser`
 * first so a brand-new account has its `users` row.
 */
export const redeem = mutation({
	args: { token: v.string() },
	returns: v.object({
		storeSubscriptionToCancel: v.union(
			v.literal("app_store"),
			v.literal("play_store"),
			v.null(),
		),
	}),
	handler: async (ctx, { token }) => {
		const userId = await requireClerkUserId(ctx);
		const user = await getUserByClerkId(ctx, userId);
		if (!user) {
			fail("NOT_FOUND", "We couldn't load your account. Please try again.");
		}

		const gift = await ctx.db
			.query("gifts")
			.withIndex("by_redeem_token", (q) => q.eq("redeemToken", token))
			.unique();
		if (!gift) fail("INVALID_GIFT", "This gift link isn't valid.");

		const status = giftDisplayStatus(gift, Date.now());
		if (status === "redeemed") {
			fail("ALREADY_REDEEMED", "This gift has already been claimed.");
		}
		if (status === "expired") {
			fail("EXPIRED", "This gift has expired.");
		}
		if (status !== "paid") {
			fail("INVALID_GIFT", "This gift is no longer available.");
		}
		if (normalizeEmail(user.email) !== gift.recipientEmail) {
			fail(
				"EMAIL_MISMATCH",
				"This gift was sent to a different email address. Sign in with that email to claim it.",
			);
		}
		if (userHasLifetime(user)) {
			fail("ALREADY_LIFETIME", "You already have lifetime access.");
		}

		const now = Date.now();
		await ctx.db.patch(gift._id, {
			status: "redeemed",
			redeemedBy: userId,
			redeemedAt: now,
			updatedAt: now,
		});
		await ctx.db.patch(user._id, {
			lifetimeAccess: { giftId: gift._id, grantedAt: now },
		});

		// A web (Stripe) subscription is now redundant: stop it renewing.
		await ctx.scheduler.runAfter(
			0,
			internal.gifts.actions.cancelStripeSubscriptionForLifetime,
			{ clerkUserId: userId },
		);

		// Store subscriptions can't be cancelled for the user; the client shows
		// a splash telling them to do it in the App Store / Play Store.
		const iap = await getActiveIapSubscription(ctx, userId);
		return {
			storeSubscriptionToCancel: iap
				? iap.provider === "apple"
					? ("app_store" as const)
					: ("play_store" as const)
				: null,
		};
	},
});

/**
 * Mark a gift paid after the provider confirmed payment. Idempotent: repeated
 * webhook deliveries (or a webhook racing a client confirmation) are no-ops,
 * so a payment can never produce two gifts or two emails (SST-4/SST-6).
 */
export const fulfillPaid = internalMutation({
	args: {
		giftId: v.id("gifts"),
		provider: v.union(
			v.literal("stripe"),
			v.literal("app_store"),
			v.literal("play_store"),
		),
		providerRef: v.string(),
		amountMinor: v.optional(v.number()),
		currency: v.optional(v.string()),
		redeemToken: v.string(),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const gift = await ctx.db.get(args.giftId);
		if (!gift) {
			console.error(`fulfillPaid: gift ${args.giftId} not found`);
			return null;
		}
		if (gift.status !== "pending_payment") return null;

		const sameRef = await ctx.db
			.query("gifts")
			.withIndex("by_provider_ref", (q) =>
				q.eq("providerRef", args.providerRef),
			)
			.first();
		if (sameRef) return null;

		const now = Date.now();
		await ctx.db.patch(gift._id, {
			status: "paid",
			provider: args.provider,
			providerRef: args.providerRef,
			amountMinor: args.amountMinor,
			currency: args.currency,
			redeemToken: args.redeemToken,
			paidAt: now,
			expiresAt: now + GIFT_VALIDITY_MS,
			updatedAt: now,
		});

		await ctx.scheduler.runAfter(
			0,
			internal.gifts.actions.deliverPurchaserEmail,
			{ giftId: gift._id },
		);
		return null;
	},
});

/**
 * Refund or chargeback (decision 4): an unredeemed gift is voided; a redeemed
 * one also loses the lifetime access it granted.
 */
export const markRefunded = internalMutation({
	args: { providerRef: v.string() },
	returns: v.null(),
	handler: async (ctx, { providerRef }) => {
		const gift = await ctx.db
			.query("gifts")
			.withIndex("by_provider_ref", (q) => q.eq("providerRef", providerRef))
			.first();
		if (!gift || gift.status === "refunded") return null;

		const now = Date.now();
		if (gift.status === "redeemed" && gift.redeemedBy) {
			const user = await getUserByClerkId(ctx, gift.redeemedBy);
			if (user?.lifetimeAccess?.giftId === gift._id) {
				await ctx.db.patch(user._id, { lifetimeAccess: undefined });
			}
		}
		await ctx.db.patch(gift._id, {
			status: "refunded",
			refundedAt: now,
			updatedAt: now,
		});
		return null;
	},
});

export const setCardImage = internalMutation({
	args: { giftId: v.id("gifts"), storageId: v.id("_storage") },
	returns: v.null(),
	handler: async (ctx, { giftId, storageId }) => {
		await ctx.db.patch(giftId, {
			cardImageId: storageId,
			updatedAt: Date.now(),
		});
		return null;
	},
});

/**
 * Claim the right to send the purchaser email. Returns false when it was
 * already sent, so concurrent deliveries send at most one.
 */
export const claimPurchaserEmailSend = internalMutation({
	args: { giftId: v.id("gifts") },
	returns: v.boolean(),
	handler: async (ctx, { giftId }) => {
		const gift = await ctx.db.get(giftId);
		if (!gift || gift.purchaserEmailSentAt) return false;
		await ctx.db.patch(giftId, { purchaserEmailSentAt: Date.now() });
		return true;
	},
});

/** Minimum gap between manual resends of the same gift email. */
const RESEND_COOLDOWN_MS = 60 * 1000;

/**
 * Gate for "Resend gift email": the caller must own the gift, and it must be
 * paid, unclaimed and unexpired. Records the attempt for the cooldown.
 */
export const claimResend = internalMutation({
	args: { giftId: v.id("gifts"), purchaserId: v.string() },
	returns: v.null(),
	handler: async (ctx, { giftId, purchaserId }) => {
		const gift = await ctx.db.get(giftId);
		if (!gift || gift.purchaserId !== purchaserId) {
			fail("NOT_FOUND", "We couldn't find that gift.");
		}
		const now = Date.now();
		const status = giftDisplayStatus(gift, now);
		if (status !== "paid") {
			fail(
				"NOT_RESENDABLE",
				status === "redeemed"
					? "This gift has already been claimed."
					: "This gift can no longer be claimed.",
			);
		}
		if (
			gift.purchaserEmailResentAt &&
			now - gift.purchaserEmailResentAt < RESEND_COOLDOWN_MS
		) {
			fail("TOO_SOON", "We just sent it. Please wait a minute and try again.");
		}
		await ctx.db.patch(giftId, { purchaserEmailResentAt: now });
		return null;
	},
});

/** Undo the claim when the send failed, so a retry can go out. */
export const releasePurchaserEmailSend = internalMutation({
	args: { giftId: v.id("gifts") },
	returns: v.null(),
	handler: async (ctx, { giftId }) => {
		await ctx.db.patch(giftId, { purchaserEmailSentAt: undefined });
		return null;
	},
});
