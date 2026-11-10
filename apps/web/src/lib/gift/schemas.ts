import { z } from "zod";

/** Limits mirror `convex/gifts/helpers.ts#GIFT_LIMITS`; the server re-validates. */
export const GIFT_MESSAGE_MAX = 500;

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

export const giftIdSearchSchema = z.object({
	giftId: z.string().optional(),
});

export const giftSuccessSearchSchema = z.object({
	giftId: z.string().optional(),
	session_id: z.string().optional(),
});
