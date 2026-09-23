import { z } from "zod";

/**
 * The seven questions are tap-to-advance choices rather than input fields, so
 * the only real form in the flow is the email step. Answers are validated
 * against the shared question config (`isCompleteAnswerSet`) and again on the
 * server, not here.
 */
export const onboardingEmailSchema = z.object({
	email: z
		.string()
		.min(1, "Enter your email.")
		.email("Enter a valid email address."),
});

export type OnboardingEmailValues = z.infer<typeof onboardingEmailSchema>;
