"use node";

import { randomBytes } from "node:crypto";
import { StripeSubscriptions } from "@convex-dev/stripe";
import { ConvexError, v } from "convex/values";
import { Resend } from "resend";
import Stripe from "stripe";

import { components, internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import type { ActionCtx } from "../_generated/server";
import { action, internalAction } from "../_generated/server";
import { getOrCreateValidStripeCustomer } from "../stripe/customerHelpers";
import { requireStripeSecretKey } from "../stripe/helpers";
import { renderGiftCardPng } from "./giftCard";
import {
	GIFT_BASE_CURRENCY,
	GIFT_BASE_PRICE_MINOR,
	giftRedeemUrl,
	isGiftStoreProduct,
} from "./helpers";

const stripeSubscriptions = new StripeSubscriptions(components.stripe, {});

/** Marks Stripe objects created for gifts, so webhooks can tell them apart. */
const GIFT_METADATA_KIND = "lifetime_gift";

function newRedeemToken(): string {
	return randomBytes(24).toString("base64url");
}

function stripeClient(): Stripe {
	try {
		return new Stripe(requireStripeSecretKey());
	} catch (error) {
		throw new ConvexError({
			code: "STRIPE_NOT_CONFIGURED",
			message:
				error instanceof Error ? error.message : "Billing is not configured.",
		});
	}
}

/**
 * Start a one-time Stripe Embedded Checkout (Elements) for a saved gift draft.
 * The price is the base USD price; Adaptive Pricing lets Stripe present and
 * charge it in the buyer's local currency. Fulfilment happens in the webhook
 * (or `confirmCheckout`), never here.
 */
export const createCheckout = action({
	args: { giftId: v.id("gifts"), returnUrl: v.string() },
	returns: v.object({ clientSecret: v.string() }),
	handler: async (ctx, args): Promise<{ clientSecret: string }> => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new ConvexError({
				code: "UNAUTHENTICATED",
				message: "You must be signed in to send a gift.",
			});
		}
		const gift: Doc<"gifts"> | null = await ctx.runQuery(
			internal.gifts.queries.getForDelivery,
			{ giftId: args.giftId },
		);
		if (!gift || gift.purchaserId !== identity.subject) {
			throw new ConvexError({
				code: "NOT_FOUND",
				message: "We couldn't find that gift. Please start again.",
			});
		}
		if (gift.status !== "pending_payment") {
			throw new ConvexError({
				code: "ALREADY_PAID",
				message: "This gift has already been paid for.",
			});
		}

		const { customerId } = await getOrCreateValidStripeCustomer(ctx, {
			userId: identity.subject,
			email: gift.purchaserEmail,
			name: gift.purchaserName,
		});

		const metadata = {
			kind: GIFT_METADATA_KIND,
			giftId: gift._id,
			userId: identity.subject,
		};
		const params = {
			ui_mode: "elements",
			mode: "payment",
			customer: customerId,
			line_items: [
				{
					price_data: {
						currency: GIFT_BASE_CURRENCY,
						unit_amount: GIFT_BASE_PRICE_MINOR,
						product_data: {
							name: "Lifetime Access Gift",
							description: `Legacy Building lifetime access for ${gift.recipientName}`,
						},
					},
					quantity: 1,
				},
			],
			adaptive_pricing: { enabled: true },
			return_url: args.returnUrl,
			metadata,
			payment_intent_data: { metadata },
		};

		// Stripe's API requires ui_mode "elements"; the bundled types lag behind
		// (same cast as stripe/embeddedCheckout.ts).
		const session = await stripeClient().checkout.sessions.create(
			params as unknown as Stripe.Checkout.SessionCreateParams,
		);
		if (!session.client_secret) {
			throw new ConvexError({
				code: "CHECKOUT_FAILED",
				message: "Could not start checkout. Please try again.",
			});
		}
		return { clientSecret: session.client_secret };
	},
});

/** Mark a gift paid from a completed Checkout Session (webhook or return page). */
async function fulfillFromSession(
	ctx: ActionCtx,
	session: Stripe.Checkout.Session,
): Promise<boolean> {
	if (session.metadata?.kind !== GIFT_METADATA_KIND) return false;
	if (session.payment_status !== "paid") return false;
	const giftId = session.metadata.giftId;
	const paymentIntentId =
		typeof session.payment_intent === "string"
			? session.payment_intent
			: session.payment_intent?.id;
	if (!giftId || !paymentIntentId) return false;

	await ctx.runMutation(internal.gifts.mutations.fulfillPaid, {
		giftId: giftId as Doc<"gifts">["_id"],
		provider: "stripe",
		providerRef: paymentIntentId,
		amountMinor: session.amount_total ?? undefined,
		currency: session.currency ?? undefined,
		redeemToken: newRedeemToken(),
	});
	return true;
}

/** Called by the Stripe webhook for checkout.session.completed / async success. */
export const fulfillStripeSession = internalAction({
	args: { sessionId: v.string() },
	returns: v.null(),
	handler: async (ctx, { sessionId }) => {
		// Re-read from Stripe instead of trusting the event payload.
		const session = await stripeClient().checkout.sessions.retrieve(sessionId);
		await fulfillFromSession(ctx, session);
		return null;
	},
});

/**
 * Return-page fallback: verifies the session with Stripe server-side and
 * fulfils it if the webhook hasn't yet. Idempotent with the webhook.
 */
export const confirmCheckout = action({
	args: { sessionId: v.string() },
	returns: v.object({ paid: v.boolean() }),
	handler: async (ctx, { sessionId }) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) return { paid: false };
		const session = await stripeClient().checkout.sessions.retrieve(sessionId);
		if (session.metadata?.userId !== identity.subject) return { paid: false };
		const paid = await fulfillFromSession(ctx, session);
		return { paid };
	},
});

type RcNonSubscription = {
	id?: string;
	store_transaction_id?: string;
	store?: string;
	is_sandbox?: boolean;
};

function storeToGiftProvider(
	store: string | undefined,
): "app_store" | "play_store" | null {
	if (store === "app_store" || store === "mac_app_store") return "app_store";
	if (store === "play_store") return "play_store";
	return null;
}

/**
 * Native app, right after the store purchase sheet succeeds: verify the
 * transaction with RevenueCat's REST API (never trust the device), then mark
 * the gift paid. Idempotent with the RevenueCat webhook.
 */
export const confirmStorePurchase = action({
	args: { giftId: v.id("gifts"), transactionId: v.string() },
	returns: v.object({ paid: v.boolean() }),
	handler: async (ctx, { giftId, transactionId }) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new ConvexError({
				code: "UNAUTHENTICATED",
				message: "You must be signed in.",
			});
		}
		const gift: Doc<"gifts"> | null = await ctx.runQuery(
			internal.gifts.queries.getForDelivery,
			{ giftId },
		);
		if (!gift || gift.purchaserId !== identity.subject) {
			throw new ConvexError({
				code: "NOT_FOUND",
				message: "We couldn't find that gift.",
			});
		}
		if (gift.status !== "pending_payment") return { paid: true };

		const apiKey = process.env.REVENUECAT_REST_API_KEY;
		if (!apiKey) {
			throw new ConvexError({
				code: "MISCONFIGURED",
				message: "Store purchases aren't configured yet.",
			});
		}
		const res = await fetch(
			`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(identity.subject)}`,
			{ headers: { Authorization: `Bearer ${apiKey}` } },
		);
		if (!res.ok) {
			throw new ConvexError({
				code: "VERIFY_FAILED",
				message: "We couldn't verify the purchase yet. It will finish shortly.",
			});
		}
		const body = (await res.json()) as {
			subscriber?: { non_subscriptions?: Record<string, RcNonSubscription[]> };
		};
		const purchases = Object.entries(body.subscriber?.non_subscriptions ?? {})
			.filter(([productId]) => isGiftStoreProduct(productId))
			.flatMap(([, list]) => list);
		const match = purchases.find(
			(p) => p.store_transaction_id === transactionId || p.id === transactionId,
		);
		const provider = storeToGiftProvider(match?.store);
		if (!match || !provider) return { paid: false };

		await ctx.runMutation(internal.gifts.mutations.fulfillPaid, {
			giftId,
			provider,
			providerRef: match.store_transaction_id ?? transactionId,
			redeemToken: newRedeemToken(),
		});
		return { paid: true };
	},
});

/** RevenueCat webhook fallback (NON_RENEWING_PURCHASE of the gift product). */
export const fulfillStoreGiftFromWebhook = internalAction({
	args: {
		appUserId: v.string(),
		transactionId: v.string(),
		store: v.optional(v.string()),
		price: v.optional(v.number()),
		currency: v.optional(v.string()),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const provider = storeToGiftProvider(args.store);
		if (!provider) return null;
		const gift: Doc<"gifts"> | null = await ctx.runQuery(
			internal.gifts.queries.findStoreCheckoutGift,
			{ purchaserId: args.appUserId },
		);
		if (!gift) {
			console.warn(
				`Gift store purchase ${args.transactionId} for ${args.appUserId} has no pending draft; the app confirmation may have handled it.`,
			);
			return null;
		}
		await ctx.runMutation(internal.gifts.mutations.fulfillPaid, {
			giftId: gift._id,
			provider,
			providerRef: args.transactionId,
			amountMinor:
				args.price !== undefined ? Math.round(args.price * 100) : undefined,
			currency: args.currency?.toLowerCase(),
			redeemToken: newRedeemToken(),
		});
		return null;
	},
});

function formatMoney(amountMinor: number, currency: string): string {
	const code = currency.toUpperCase();
	const zeroDecimal = new Set(["JPY", "KRW", "VND", "CLP", "XAF", "XOF"]);
	const value = zeroDecimal.has(code) ? amountMinor : amountMinor / 100;
	try {
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: code,
		}).format(value);
	} catch {
		return `${value.toFixed(2)} ${code}`;
	}
}

function escapeHtml(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

function cardInput(gift: Doc<"gifts">, redeemUrl: string) {
	return {
		recipientName: gift.recipientName,
		purchaserName: gift.purchaserName,
		title: gift.title,
		message: gift.message,
		redeemUrl,
	};
}

/** Send the purchaser email (receipt + card + Claim My Gift link) via Resend. */
async function sendPurchaserEmail(
	gift: Doc<"gifts">,
	redeemUrl: string,
	png: Buffer,
	apiKey: string,
): Promise<string | null> {
	const resend = new Resend(apiKey);
	const { error } = await resend.emails.send({
		from: "Legacy Building Journals <hello@legacybuildingjournals.com>",
		to: [gift.purchaserEmail],
		subject: gift.title,
		html: buildPurchaserEmailHtml(gift, redeemUrl),
		attachments: [{ filename: "Gift Card.png", content: png }],
	});
	return error ? error.message : null;
}

function buildPurchaserEmailHtml(
	gift: Doc<"gifts">,
	redeemUrl: string,
): string {
	const firstName = (
		gift.recipientName.split(" ")[0] ?? gift.recipientName
	).trim();
	const amount =
		gift.amountMinor !== undefined && gift.currency
			? formatMoney(gift.amountMinor, gift.currency)
			: formatMoney(GIFT_BASE_PRICE_MINOR, GIFT_BASE_CURRENCY);
	const paidOn = new Date(gift.paidAt ?? Date.now()).toLocaleDateString(
		"en-US",
		{ year: "numeric", month: "long", day: "numeric" },
	);
	const expires = gift.expiresAt
		? new Date(gift.expiresAt).toLocaleDateString("en-US", {
				year: "numeric",
				month: "long",
				day: "numeric",
			})
		: null;
	const message = gift.message
		? `<p style="margin:16px 0;padding:12px 16px;border-left:3px solid #0f766e;color:#334155;font-style:italic;white-space:pre-line">${escapeHtml(gift.message)}</p>`
		: "";

	return `<!doctype html><html><body style="margin:0;background:#f6f4ef;font-family:Arial,Helvetica,sans-serif;color:#1a1a1a">
<div style="max-width:560px;margin:0 auto;padding:24px">
  <div style="background:#ffffff;border-radius:16px;padding:28px">
    <p style="margin:0 0 12px;color:#0f766e;font-size:12px;letter-spacing:.08em;text-transform:uppercase">Your gift is ready to share</p>
    <p style="margin:0 0 16px">Your gift for ${escapeHtml(gift.recipientName)} is confirmed. <strong>We haven't sent anything to them.</strong> Forward this email, share the attached gift card, or print it, whenever you choose.</p>
    <hr style="border:none;border-top:1px solid #e5e5e5;margin:20px 0" />
    <p style="margin:0 0 12px">Hi ${escapeHtml(firstName)},</p>
    <p style="margin:0 0 12px"><strong>${escapeHtml(gift.purchaserName)} has gifted you a lifetime membership to Legacy Building Journals!</strong> 🎁</p>
    <p style="margin:0 0 12px">It's a private space to capture your memories, experiences, and the stories that matter most.</p>
    ${message}
    <p style="margin:24px 0;text-align:center">
      <a href="${redeemUrl}" style="display:inline-block;background:#0f766e;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:999px;font-weight:bold">Claim My Gift</a>
    </p>
    <p style="margin:0 0 8px;color:#64748b;font-size:13px;text-align:center">Or scan the QR code on the attached gift card, or open this link:<br /><a href="${redeemUrl}" style="color:#0f766e;word-break:break-all">${redeemUrl}</a></p>
    <p style="margin:0;color:#64748b;font-size:13px;text-align:center">To claim it, sign in or create an account with <strong>${escapeHtml(gift.recipientEmail)}</strong>.${expires ? ` The gift can be claimed until ${expires}.` : ""}</p>
    <hr style="border:none;border-top:1px solid #e5e5e5;margin:24px 0" />
    <p style="margin:0 0 8px;font-weight:bold">Receipt</p>
    <table style="width:100%;font-size:14px;color:#334155;border-collapse:collapse">
      <tr><td style="padding:4px 0">Item</td><td style="padding:4px 0;text-align:right">Lifetime Access Gift</td></tr>
      <tr><td style="padding:4px 0">Recipient</td><td style="padding:4px 0;text-align:right">${escapeHtml(gift.recipientName)} (${escapeHtml(gift.recipientEmail)})</td></tr>
      <tr><td style="padding:4px 0">Purchased by</td><td style="padding:4px 0;text-align:right">${escapeHtml(gift.purchaserName)}</td></tr>
      <tr><td style="padding:4px 0">Date</td><td style="padding:4px 0;text-align:right">${paidOn}</td></tr>
      <tr><td style="padding:4px 0;font-weight:bold">Total paid</td><td style="padding:4px 0;text-align:right;font-weight:bold">${amount}</td></tr>
      ${gift.providerRef ? `<tr><td style="padding:4px 0;color:#94a3b8">Reference</td><td style="padding:4px 0;text-align:right;color:#94a3b8">${escapeHtml(gift.providerRef)}</td></tr>` : ""}
    </table>
    <p style="margin:16px 0 0;color:#94a3b8;font-size:12px">You can download the gift card again any time from Account → Gift &amp; Invite.</p>
  </div>
</div></body></html>`;
}

/**
 * SST-5 + SST-6: generate the gift card, store it, and email the purchaser
 * their receipt + card + Claim My Gift link. Never emails the recipient.
 * Sent at most once per gift (`claimPurchaserEmailSend`).
 */
export const deliverPurchaserEmail = internalAction({
	args: { giftId: v.id("gifts") },
	returns: v.null(),
	handler: async (ctx, { giftId }) => {
		const gift: Doc<"gifts"> | null = await ctx.runQuery(
			internal.gifts.queries.getForDelivery,
			{ giftId },
		);
		if (!gift?.redeemToken || gift.status === "pending_payment") return null;

		const redeemUrl = giftRedeemUrl(gift.redeemToken);
		const png = await renderGiftCardPng(cardInput(gift, redeemUrl));

		if (!gift.cardImageId) {
			const storageId = await ctx.storage.store(
				new Blob([new Uint8Array(png)], { type: "image/png" }),
			);
			await ctx.runMutation(internal.gifts.mutations.setCardImage, {
				giftId,
				storageId,
			});
		}

		const apiKey = process.env.RESEND_API_KEY;
		if (!apiKey) {
			console.error("Missing RESEND_API_KEY; gift email not sent.");
			return null;
		}

		const claimed = await ctx.runMutation(
			internal.gifts.mutations.claimPurchaserEmailSend,
			{ giftId },
		);
		if (!claimed) return null;

		const error = await sendPurchaserEmail(gift, redeemUrl, png, apiKey);
		if (error) {
			await ctx.runMutation(
				internal.gifts.mutations.releasePurchaserEmailSend,
				{
					giftId,
				},
			);
			// Throwing lets the scheduler surface the failure in the dashboard logs.
			throw new Error(`Resend error sending gift ${giftId}: ${error}`);
		}
		return null;
	},
});

/**
 * Resend the gift email to the purchaser (Account → Gift & Invite), e.g. if
 * they lost it. Only for paid, unclaimed, unexpired gifts; throttled.
 */
export const resendPurchaserEmail = action({
	args: { giftId: v.id("gifts") },
	returns: v.null(),
	handler: async (ctx, { giftId }) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new ConvexError({
				code: "UNAUTHENTICATED",
				message: "You must be signed in.",
			});
		}
		// Validates ownership + status and records the resend (throttle).
		await ctx.runMutation(internal.gifts.mutations.claimResend, {
			giftId,
			purchaserId: identity.subject,
		});
		const gift: Doc<"gifts"> | null = await ctx.runQuery(
			internal.gifts.queries.getForDelivery,
			{ giftId },
		);
		if (!gift?.redeemToken) {
			throw new ConvexError({
				code: "NOT_FOUND",
				message: "We couldn't find that gift.",
			});
		}
		const apiKey = process.env.RESEND_API_KEY;
		if (!apiKey) {
			throw new ConvexError({
				code: "MISCONFIGURED",
				message: "Email isn't configured right now. Please try later.",
			});
		}
		const redeemUrl = giftRedeemUrl(gift.redeemToken);
		const png = await renderGiftCardPng(cardInput(gift, redeemUrl));
		const error = await sendPurchaserEmail(gift, redeemUrl, png, apiKey);
		if (error) {
			throw new ConvexError({
				code: "SEND_FAILED",
				message: "We couldn't send the email. Please try again shortly.",
			});
		}
		return null;
	},
});

/**
 * After a gift is redeemed, stop any web (Stripe) subscription from renewing.
 * Cancels at period end so the user keeps what they paid for and is never
 * charged again. Store subscriptions are handled by the client splash.
 */
export const cancelStripeSubscriptionForLifetime = internalAction({
	args: { clerkUserId: v.string() },
	returns: v.null(),
	handler: async (ctx, { clerkUserId }) => {
		const subscriptions = await ctx.runQuery(
			components.stripe.public.listSubscriptionsByUserId,
			{ userId: clerkUserId },
		);
		for (const sub of subscriptions) {
			const live =
				sub.status === "active" ||
				sub.status === "trialing" ||
				sub.status === "past_due";
			if (!live || sub.cancelAtPeriodEnd) continue;
			await stripeSubscriptions.cancelSubscription(ctx, {
				stripeSubscriptionId: sub.stripeSubscriptionId,
				cancelAtPeriodEnd: true,
			});
		}
		return null;
	},
});
