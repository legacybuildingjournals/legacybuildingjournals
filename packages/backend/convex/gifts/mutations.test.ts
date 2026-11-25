import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { testModules } from "../../test/modules";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import schema from "../schema";

function setup() {
	return convexTest(schema, testModules);
}

type TestConvex = ReturnType<typeof setup>;

const BUYER = { subject: "user_buyer", email: "buyer@example.com" };
const RECIPIENT = { subject: "user_recipient", email: "chris@example.com" };

async function seedUser(
	t: TestConvex,
	clerkId: string,
	email: string,
): Promise<Id<"users">> {
	return await t.run(async (ctx) =>
		ctx.db.insert("users", { clerkId, email, name: "Test User", role: "user" }),
	);
}

async function draftGift(t: TestConvex, recipientEmail = "Chris@Example.com") {
	return await t.withIdentity(BUYER).mutation(api.gifts.mutations.saveDraft, {
		recipientName: "Chris Johnson",
		recipientEmail,
		title: "A Gift for Your Story",
		message: "Happy birthday!",
	});
}

async function pay(t: TestConvex, giftId: Id<"gifts">, ref = "pi_1") {
	await t.mutation(internal.gifts.mutations.fulfillPaid, {
		giftId,
		provider: "stripe",
		providerRef: ref,
		amountMinor: 9900,
		currency: "usd",
		redeemToken: `token_${ref}`,
	});
}

// Scheduled side effects (email delivery, Stripe cancellation) are node actions
// that need real credentials; fake timers keep them from running.
beforeEach(() => {
	vi.useFakeTimers();
});
afterEach(() => {
	vi.useRealTimers();
});

describe("gift drafts", () => {
	test("normalises the recipient email and stores purchaser details", async () => {
		const t = setup();
		await seedUser(t, BUYER.subject, BUYER.email);
		const giftId = await draftGift(t);
		const gift = await t.run((ctx) => ctx.db.get(giftId));
		expect(gift?.recipientEmail).toBe("chris@example.com");
		expect(gift?.purchaserEmail).toBe(BUYER.email);
		expect(gift?.status).toBe("pending_payment");
	});

	test("updates the same draft on retry", async () => {
		const t = setup();
		await seedUser(t, BUYER.subject, BUYER.email);
		const giftId = await draftGift(t);
		const again = await t
			.withIdentity(BUYER)
			.mutation(api.gifts.mutations.saveDraft, {
				giftId,
				recipientName: "Chris J",
				recipientEmail: "chris@example.com",
				title: "Updated",
				message: "",
			});
		expect(again).toBe(giftId);
	});

	test("rejects gifting to yourself", async () => {
		const t = setup();
		await seedUser(t, BUYER.subject, BUYER.email);
		await expect(draftGift(t, BUYER.email)).rejects.toThrow(/own email/);
	});

	test("rejects recipients who already have lifetime access", async () => {
		const t = setup();
		await seedUser(t, BUYER.subject, BUYER.email);
		const recipientId = await seedUser(t, RECIPIENT.subject, RECIPIENT.email);
		const first = await draftGift(t);
		await pay(t, first);
		await t.run((ctx) =>
			ctx.db.patch(recipientId, {
				lifetimeAccess: { giftId: first, grantedAt: Date.now() },
			}),
		);
		await expect(draftGift(t)).rejects.toThrow(/already has lifetime/);
	});
});

describe("payment fulfilment", () => {
	test("is idempotent across repeated webhooks", async () => {
		const t = setup();
		await seedUser(t, BUYER.subject, BUYER.email);
		const giftId = await draftGift(t);
		await pay(t, giftId, "pi_same");
		await pay(t, giftId, "pi_same");
		const gift = await t.run((ctx) => ctx.db.get(giftId));
		expect(gift?.status).toBe("paid");
		expect(gift?.redeemToken).toBe("token_pi_same");
		expect(gift?.expiresAt).toBeGreaterThan(gift?.paidAt ?? 0);
	});

	test("unpaid drafts are not in the purchaser's history", async () => {
		const t = setup();
		await seedUser(t, BUYER.subject, BUYER.email);
		await draftGift(t);
		const history = await t
			.withIdentity(BUYER)
			.query(api.gifts.queries.listMine, {});
		expect(history).toHaveLength(0);
	});
});

describe("redemption", () => {
	test("grants lifetime access to the matching account, once", async () => {
		const t = setup();
		await seedUser(t, BUYER.subject, BUYER.email);
		await seedUser(t, RECIPIENT.subject, RECIPIENT.email);
		const giftId = await draftGift(t);
		await pay(t, giftId);

		const result = await t
			.withIdentity(RECIPIENT)
			.mutation(api.gifts.mutations.redeem, { token: "token_pi_1" });
		expect(result.storeSubscriptionToCancel).toBeNull();

		const entitlement = await t
			.withIdentity(RECIPIENT)
			.query(api.subscriptions.queries.getEntitlement, {});
		expect(entitlement.hasAccess).toBe(true);
		expect(entitlement.isLifetime).toBe(true);

		await expect(
			t
				.withIdentity(RECIPIENT)
				.mutation(api.gifts.mutations.redeem, { token: "token_pi_1" }),
		).rejects.toThrow(/already been claimed/);
	});

	test("rejects an account with a different email", async () => {
		const t = setup();
		await seedUser(t, BUYER.subject, BUYER.email);
		const giftId = await draftGift(t);
		await pay(t, giftId);
		await expect(
			t
				.withIdentity(BUYER)
				.mutation(api.gifts.mutations.redeem, { token: "token_pi_1" }),
		).rejects.toThrow(/different email/);
	});

	test("rejects expired gifts", async () => {
		const t = setup();
		await seedUser(t, BUYER.subject, BUYER.email);
		await seedUser(t, RECIPIENT.subject, RECIPIENT.email);
		const giftId = await draftGift(t);
		await pay(t, giftId);
		await t.run((ctx) => ctx.db.patch(giftId, { expiresAt: Date.now() - 1 }));
		await expect(
			t
				.withIdentity(RECIPIENT)
				.mutation(api.gifts.mutations.redeem, { token: "token_pi_1" }),
		).rejects.toThrow(/expired/);
	});

	test("a refund after redemption revokes lifetime access", async () => {
		const t = setup();
		await seedUser(t, BUYER.subject, BUYER.email);
		await seedUser(t, RECIPIENT.subject, RECIPIENT.email);
		const giftId = await draftGift(t);
		await pay(t, giftId);
		await t
			.withIdentity(RECIPIENT)
			.mutation(api.gifts.mutations.redeem, { token: "token_pi_1" });

		await t.mutation(internal.gifts.mutations.markRefunded, {
			providerRef: "pi_1",
		});

		// (getEntitlement would now fall through to the Stripe component, which
		// convex-test doesn't register, so check the user row directly.)
		const recipient = await t.run((ctx) =>
			ctx.db
				.query("users")
				.withIndex("by_clerk_id", (q) => q.eq("clerkId", RECIPIENT.subject))
				.unique(),
		);
		expect(recipient?.lifetimeAccess).toBeUndefined();
		const gift = await t.run((ctx) => ctx.db.get(giftId));
		expect(gift?.status).toBe("refunded");
	});
});

describe("resend gate", () => {
	test("allows the purchaser once per minute, only while unclaimed", async () => {
		const t = setup();
		await seedUser(t, BUYER.subject, BUYER.email);
		await seedUser(t, RECIPIENT.subject, RECIPIENT.email);
		const giftId = await draftGift(t);
		await pay(t, giftId);

		await t.mutation(internal.gifts.mutations.claimResend, {
			giftId,
			purchaserId: BUYER.subject,
		});
		await expect(
			t.mutation(internal.gifts.mutations.claimResend, {
				giftId,
				purchaserId: BUYER.subject,
			}),
		).rejects.toThrow(/wait a minute/);
		await expect(
			t.mutation(internal.gifts.mutations.claimResend, {
				giftId,
				purchaserId: RECIPIENT.subject,
			}),
		).rejects.toThrow(/couldn't find/);

		await t
			.withIdentity(RECIPIENT)
			.mutation(api.gifts.mutations.redeem, { token: "token_pi_1" });
		await t.run((ctx) => ctx.db.patch(giftId, { purchaserEmailResentAt: 0 }));
		await expect(
			t.mutation(internal.gifts.mutations.claimResend, {
				giftId,
				purchaserId: BUYER.subject,
			}),
		).rejects.toThrow(/already been claimed/);
	});
});

describe("account deletion", () => {
	test("keeps purchase records but removes personal details", async () => {
		const t = setup();
		await seedUser(t, BUYER.subject, BUYER.email);
		await seedUser(t, RECIPIENT.subject, RECIPIENT.email);
		const draftOnly = await draftGift(t, "other@example.com");
		const unclaimed = await draftGift(t, "someone@example.com");
		await pay(t, unclaimed, "pi_unclaimed");
		const claimed = await draftGift(t);
		await pay(t, claimed, "pi_claimed");
		await t
			.withIdentity(RECIPIENT)
			.mutation(api.gifts.mutations.redeem, { token: "token_pi_claimed" });

		await t.mutation(internal.user.mutations.deleteByClerkId, {
			clerkId: BUYER.subject,
		});

		const [draft, open, done] = await t.run(async (ctx) => [
			await ctx.db.get(draftOnly),
			await ctx.db.get(unclaimed),
			await ctx.db.get(claimed),
		]);
		expect(draft).toBeNull();
		// Unclaimed gift: purchaser gone, still redeemable for the recipient.
		expect(open?.purchaserEmail).toBe("");
		expect(open?.purchaserId).toBe("deleted");
		expect(open?.recipientEmail).toBe("someone@example.com");
		expect(open?.amountMinor).toBe(9900);
		// Claimed gift: purchaser details cleared, payment record kept.
		expect(done?.purchaserEmail).toBe("");
		expect(done?.message).toBe("");
		expect(done?.providerRef).toBe("pi_claimed");

		await t.mutation(internal.user.mutations.deleteByClerkId, {
			clerkId: RECIPIENT.subject,
		});
		const afterRecipient = await t.run((ctx) => ctx.db.get(claimed));
		expect(afterRecipient?.recipientEmail).toBe("");
		expect(afterRecipient?.redeemedBy).toBe("deleted");
		expect(afterRecipient?.status).toBe("redeemed");
	});
});
