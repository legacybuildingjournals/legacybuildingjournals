import type { Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

/**
 * Base gift price. Charged in USD on web; Stripe Adaptive Pricing converts it
 * to the buyer's local currency at checkout. On mobile the store's own
 * localised price for the gift product applies instead.
 */
export const GIFT_BASE_PRICE_MINOR = 9900;
export const GIFT_BASE_CURRENCY = "usd";

/**
 * Store product id of the gift (a non-renewing / consumable in-app product in
 * App Store Connect and Play Console, imported into RevenueCat). Must match
 * `apps/native/lib/billing/gift.ts#GIFT_STORE_PRODUCT_ID`.
 */
export const GIFT_STORE_PRODUCT_ID = "lifetime_gift";

/** True for the gift product, so subscription webhooks can ignore it. */
export function isGiftStoreProduct(productId: unknown): boolean {
	return (
		typeof productId === "string" && productId.includes(GIFT_STORE_PRODUCT_ID)
	);
}

/** Unredeemed gifts expire 12 months after payment. */
export const GIFT_VALIDITY_MS = 365 * 24 * 60 * 60 * 1000;

export const GIFT_LIMITS = {
	nameMax: 80,
	titleMax: 120,
	messageMax: 500,
} as const;

/** Where the QR code and Claim My Gift link point. Always the web app. */
export function giftRedeemPath(token: string): string {
	return `/gift/${token}`;
}

export function webAppOrigin(): string {
	return (
		process.env.WEB_APP_URL ??
		process.env.APP_URL ??
		"https://app.legacybuildingjournals.com"
	).replace(/\/$/, "");
}

export function giftRedeemUrl(token: string): string {
	return `${webAppOrigin()}${giftRedeemPath(token)}`;
}

export function normalizeEmail(email: string): string {
	return email.trim().toLowerCase();
}

/** Loose but practical: something@something.tld, no spaces. */
export function isValidEmail(email: string): boolean {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** `c•••@gmail.com`: enough for the recipient to recognise, not to harvest. */
export function maskEmail(email: string): string {
	const [local, domain] = email.split("@");
	if (!local || !domain) return email;
	return `${local[0]}•••@${domain}`;
}

export type GiftDisplayStatus =
	| "pending_payment"
	| "paid"
	| "redeemed"
	| "expired"
	| "refunded";

/** Stored status plus computed expiry. */
export function giftDisplayStatus(
	gift: Doc<"gifts">,
	now: number,
): GiftDisplayStatus {
	if (gift.status === "paid" && gift.expiresAt && gift.expiresAt <= now) {
		return "expired";
	}
	return gift.status;
}

export async function getUserByClerkId(
	ctx: QueryCtx | MutationCtx,
	clerkId: string,
): Promise<Doc<"users"> | null> {
	return await ctx.db
		.query("users")
		.withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
		.unique();
}

/**
 * Users are stored with the email Clerk gave us, which is not guaranteed to be
 * lower-cased, so check the exact value and the normalised one.
 */
export async function getUsersByEmail(
	ctx: QueryCtx | MutationCtx,
	email: string,
): Promise<Doc<"users">[]> {
	const normalized = normalizeEmail(email);
	const exact = await ctx.db
		.query("users")
		.withIndex("by_email", (q) => q.eq("email", email.trim()))
		.collect();
	if (normalized === email.trim()) return exact;
	const lower = await ctx.db
		.query("users")
		.withIndex("by_email", (q) => q.eq("email", normalized))
		.collect();
	return [...exact, ...lower];
}

export function userHasLifetime(user: Doc<"users"> | null): boolean {
	return Boolean(user?.lifetimeAccess);
}

/** Placeholder written over personal details when an account is deleted. */
export const DELETED_USER_LABEL = "A Legacy Building member";
export const DELETED_USER_ID = "deleted";

/**
 * Account deletion (decision: keep purchase records, remove personal details).
 * - Unpaid drafts the user started are deleted outright.
 * - Gifts the user bought: purchaser identity is removed. A paid, unclaimed
 *   gift stays redeemable (the recipient is still owed it), so its recipient,
 *   title, message and card are kept; otherwise those are cleared too.
 * - Gifts the user redeemed: recipient identity, message and card are removed.
 * Financial fields (amount, currency, provider, providerRef, dates, status)
 * are always kept.
 */
export async function scrubGiftsForDeletedUser(
	ctx: MutationCtx,
	clerkId: string,
): Promise<void> {
	const now = Date.now();
	const bought = await ctx.db
		.query("gifts")
		.withIndex("by_purchaser", (q) => q.eq("purchaserId", clerkId))
		.collect();
	for (const gift of bought) {
		if (gift.status === "pending_payment") {
			await ctx.db.delete(gift._id);
			continue;
		}
		const stillRedeemable = giftDisplayStatus(gift, now) === "paid";
		if (!stillRedeemable && gift.cardImageId) {
			await ctx.storage.delete(gift.cardImageId);
		}
		await ctx.db.patch(gift._id, {
			purchaserId: DELETED_USER_ID,
			purchaserName: DELETED_USER_LABEL,
			purchaserEmail: "",
			...(stillRedeemable
				? {}
				: {
						recipientName: "",
						recipientEmail: "",
						title: "",
						message: "",
						cardImageId: undefined,
					}),
			updatedAt: now,
		});
	}

	const redeemed = await ctx.db
		.query("gifts")
		.withIndex("by_status", (q) => q.eq("status", "redeemed"))
		.filter((q) => q.eq(q.field("redeemedBy"), clerkId))
		.collect();
	for (const gift of redeemed) {
		if (gift.cardImageId) await ctx.storage.delete(gift.cardImageId);
		await ctx.db.patch(gift._id, {
			redeemedBy: DELETED_USER_ID,
			recipientName: "",
			recipientEmail: "",
			title: "",
			message: "",
			cardImageId: undefined,
			updatedAt: now,
		});
	}
}
