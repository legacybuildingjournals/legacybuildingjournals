import { z } from "zod";

/** Mirrors apps/web/src/lib/gift/schemas.ts; the server re-validates. */
export const GIFT_MESSAGE_MAX = 150;

export const giftDetailsSchema = z.object({
	recipientName: z
		.string()
		.trim()
		.min(1, "Enter the recipient's name.")
		.max(80, "The name is too long."),
	recipientEmail: z
		.string()
		.trim()
		.min(1, "Enter the recipient's email.")
		.email("Enter a valid email address."),
	title: z
		.string()
		.trim()
		.min(1, "Add a title for your gift.")
		.max(120, "The title is too long."),
	message: z
		.string()
		.max(GIFT_MESSAGE_MAX, `Keep it under ${GIFT_MESSAGE_MAX} characters.`),
});

export type GiftDetailsValues = z.infer<typeof giftDetailsSchema>;
