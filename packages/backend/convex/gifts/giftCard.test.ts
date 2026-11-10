// @vitest-environment node
import { writeFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

import { renderGiftCardPng } from "./giftCard";

function pngSize(png: Buffer) {
	return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

describe("gift card", () => {
	test("renders a print-size PNG", async () => {
		const png = await renderGiftCardPng({
			recipientName: "Chris Johnson",
			recipientEmail: "chris.johnson@example.com",
			purchaserName: "Michael Smith",
			title: "A Gift for Your Story",
			message:
				"Happy birthday, Chris! Start writing the stories only you can tell, so the people you love can read them for years to come.",
			redeemUrl:
				"https://app.legacybuildingjournals.com/gift/Zq3x8VYb1n2Kp0aLmQwErTyU7iOpAsDf",
			expiresAt: Date.UTC(2027, 10, 10),
		});
		expect(png.subarray(1, 4).toString()).toBe("PNG");
		expect(pngSize(png)).toEqual({ width: 1200, height: 1800 });
		if (process.env.GIFT_CARD_PREVIEW) {
			writeFileSync(process.env.GIFT_CARD_PREVIEW, png);
		}
	});

	test("survives very long names and an empty message", async () => {
		const png = await renderGiftCardPng({
			recipientName: "Maximilian Alexander Featherstonehaugh-Worthington III",
			recipientEmail:
				"a.very.long.email.address.for.testing@some-long-domain.example.com",
			purchaserName: "The Entire Extended Johnson-Smith Family Of Springfield",
			title: "x".repeat(120),
			message: "",
			redeemUrl: "https://app.legacybuildingjournals.com/gift/abc",
		});
		expect(pngSize(png)).toEqual({ width: 1200, height: 1800 });
	});
});
