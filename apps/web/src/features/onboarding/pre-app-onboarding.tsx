import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "@legacy-building/backend/convex/_generated/api";
import {
	type AnswerState,
	applyAnswer,
	EMPTY_ANSWER_STATE,
	questionsFor,
	RECIPIENT_QUESTION,
} from "@legacy-building/backend/convex/onboarding/questions";
import { Button } from "@legacy-building/ui/components/button";
import {
	Field,
	FieldError,
	FieldLabel,
} from "@legacy-building/ui/components/field";
import { Input } from "@legacy-building/ui/components/input";
import { assets } from "@legacy-building/ui/lib/brand-journal";
import { useMutation } from "convex/react";
import { ChevronLeft } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { OnboardingQuestionStep } from "@/components/onboarding/onboarding-question-step";
import { OnboardingShell } from "@/components/onboarding/onboarding-shell";
import {
	type OnboardingEmailValues,
	onboardingEmailSchema,
} from "@/lib/onboarding/schemas";

import { OnboardingSuccess } from "./onboarding-success";

type Phase = "questions" | "email" | "success";

/**
 * The external, pre-account onboarding form.
 *
 * Answers are collected first and the email last: asking for an address up
 * front is the step people bounce on, and the questions are what the product
 * actually needs. Nothing is written until the email step submits.
 */
export function PreAppOnboarding() {
	const submitExternal = useMutation(api.onboarding.mutations.submitExternal);

	const [phase, setPhase] = useState<Phase>("questions");
	const [answerState, setAnswerState] =
		useState<AnswerState>(EMPTY_ANSWER_STATE);
	const [questionIndex, setQuestionIndex] = useState(0);
	const [token, setToken] = useState<string | null>(null);

	const form = useForm<OnboardingEmailValues>({
		resolver: zodResolver(onboardingEmailSchema),
		defaultValues: { email: "" },
	});

	const questions = answerState.recipient
		? questionsFor(answerState.recipient)
		: [RECIPIENT_QUESTION];
	const currentQuestion = questions[questionIndex] ?? RECIPIENT_QUESTION;

	const handleSelect = (optionId: string) => {
		const next = applyAnswer(answerState, currentQuestion.id, optionId);
		setAnswerState(next);

		// Changing Q1 swaps in a different question set, so re-read the length
		// here instead of trusting the list rendered for the previous recipient.
		const nextQuestions = next.recipient
			? questionsFor(next.recipient)
			: [RECIPIENT_QUESTION];

		if (questionIndex < nextQuestions.length - 1) {
			setQuestionIndex(questionIndex + 1);
			return;
		}
		setPhase("email");
	};

	const handleBack = () => {
		if (questionIndex === 0) return;
		setQuestionIndex(questionIndex - 1);
	};

	const onSubmit = form.handleSubmit(async (values) => {
		if (!answerState.recipient) return;
		try {
			const result = await submitExternal({
				email: values.email,
				recipient: answerState.recipient,
				answers: Object.entries(answerState.answers).map(
					([questionId, optionId]) => ({ questionId, optionId }),
				),
			});
			setToken(result.token);
			setPhase("success");
			toast.success("Your answers are saved.");
		} catch (error) {
			const message =
				error instanceof Error && "data" in error
					? ((error.data as { message?: string } | undefined)?.message ??
						"Something went wrong. Please try again.")
					: "Something went wrong. Please try again.";
			form.setError("root", { message });
			toast.error(message);
		}
	});

	if (phase === "success" && answerState.recipient && token) {
		return (
			<OnboardingSuccess
				recipient={answerState.recipient}
				answers={answerState.answers}
				token={token}
			/>
		);
	}

	return (
		<OnboardingShell>
			{/* Both bundled logos are white marks for dark grounds, so the badge
				    is what makes it legible on this light page. */}
			<span className="flex w-fit items-center rounded-xl bg-primary px-3 py-2">
				<img
					src={assets.whiteLogo}
					alt="Legacy Building"
					className="h-6 object-contain"
				/>
			</span>

			{phase === "questions" ? (
				<OnboardingQuestionStep
					question={currentQuestion}
					index={questionIndex + 1}
					selectedOptionId={answerState.answers[currentQuestion.id]}
					busy={false}
					onSelect={handleSelect}
					onBack={questionIndex > 0 ? handleBack : undefined}
				/>
			) : (
				<AnimatePresence mode="wait">
					<motion.form
						key="email"
						onSubmit={onSubmit}
						initial={{ opacity: 0, x: 16 }}
						animate={{ opacity: 1, x: 0 }}
						transition={{ duration: 0.2, ease: "easeOut" }}
						className="flex flex-col gap-4"
					>
						<button
							type="button"
							onClick={() => setPhase("questions")}
							disabled={form.formState.isSubmitting}
							className="-ml-2 flex w-fit items-center gap-1 rounded-full px-2 py-1 text-foreground text-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98] disabled:opacity-40"
						>
							<ChevronLeft className="size-4" aria-hidden="true" />
							Back
						</button>

						<h1 className="font-semibold text-2xl text-foreground leading-tight sm:text-3xl">
							Where should we send your results?
						</h1>
						<p className="text-muted-foreground text-sm sm:text-base">
							We'll use this to set up your journal when you're ready.
						</p>

						<Controller
							name="email"
							control={form.control}
							render={({ field, fieldState }) => (
								<Field data-invalid={fieldState.invalid}>
									<FieldLabel htmlFor={field.name}>Email</FieldLabel>
									<Input
										{...field}
										id={field.name}
										type="email"
										autoComplete="email"
										placeholder="you@example.com"
										aria-invalid={fieldState.invalid}
									/>
									{fieldState.invalid ? (
										<FieldError errors={[fieldState.error]} />
									) : null}
								</Field>
							)}
						/>

						{form.formState.errors.root ? (
							<p className="text-destructive text-sm">
								{form.formState.errors.root.message}
							</p>
						) : null}

						<Button
							type="submit"
							size="lg"
							disabled={form.formState.isSubmitting}
							className="mt-2 transition-all active:scale-[0.98]"
						>
							{form.formState.isSubmitting ? "Saving..." : "See my results"}
						</Button>
					</motion.form>
				</AnimatePresence>
			)}
		</OnboardingShell>
	);
}
