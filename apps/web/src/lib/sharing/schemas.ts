import { z } from "zod";

export const SHARE_RECIPIENT_NAME_MAX = 80;

export const shareInviteSchema = z.object({
	recipientName: z
		.string()
		.trim()
		.min(1, "Enter their name.")
		.max(
			SHARE_RECIPIENT_NAME_MAX,
			`Keep the name under ${SHARE_RECIPIENT_NAME_MAX} characters.`,
		),
	email: z
		.string()
		.trim()
		.min(1, "Enter their email address.")
		.email("Enter a valid email address."),
});

export type ShareInviteValues = z.infer<typeof shareInviteSchema>;
