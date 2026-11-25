import { z } from "zod";

export const signInSchema = z.object({
	email: z.string().min(1, "Enter your email.").email("Enter a valid email."),
	password: z.string().min(1, "Enter your password."),
});

export type SignInFormValues = z.infer<typeof signInSchema>;

/** One-time email code Clerk asks for when it doesn't recognise the browser. */
export const signInCodeSchema = z.object({
	code: z
		.string()
		.trim()
		.min(1, "Enter the verification code.")
		.regex(/^\d+$/, "Enter a valid numeric code."),
});

export type SignInCodeFormValues = z.infer<typeof signInCodeSchema>;
