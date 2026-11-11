import { z } from "zod";

export const shareInviteSchema = z.object({
	email: z
		.string()
		.trim()
		.min(1, "Enter their email address.")
		.email("Enter a valid email address."),
});

export type ShareInviteValues = z.infer<typeof shareInviteSchema>;
