import { api } from "@legacy-building/backend/convex/_generated/api";
import {
	type AnswerState,
	applyAnswer,
	EMPTY_ANSWER_STATE,
	questionsFor,
	RECIPIENT_QUESTION,
	type Recipient,
} from "@legacy-building/backend/convex/onboarding/questions";
import { resultFor } from "@legacy-building/backend/convex/onboarding/results";
import { Button } from "@legacy-building/ui/components/button";
import { useMutation } from "convex/react";
import { motion } from "motion/react";
import { useState } from "react";

import { ConfettiBurst } from "@/components/onboarding/confetti-burst";
import { OnboardingQuestionStep } from "@/components/onboarding/onboarding-question-step";
import { OnboardingShell } from "@/components/onboarding/onboarding-shell";
import {
	messageFromUnknownError,
	toastMutationError,
} from "@/lib/journal/toast";

type WelcomeOnboardingProps = {
	/**
	 * Runs once the answers are saved; marks welcome complete and moves on.
	 * The recipient decides which library shelf the user lands on.
	 */
	onFinish: (recipient: Recipient) => void;
	finishing: boolean;
};

/** The in-app questionnaire, shown to users who didn't complete it externally. */
export function WelcomeOnboarding({
	onFinish,
	finishing,
}: WelcomeOnboardingProps) {
	const submitInApp = useMutation(api.onboarding.mutations.submitInApp);

	const [answerState, setAnswerState] =
		useState<AnswerState>(EMPTY_ANSWER_STATE);
	const [questionIndex, setQuestionIndex] = useState(0);
	const [saving, setSaving] = useState(false);
	const [showResult, setShowResult] = useState(false);

	const questions = answerState.recipient
		? questionsFor(answerState.recipient)
		: [RECIPIENT_QUESTION];
	const currentQuestion = questions[questionIndex] ?? RECIPIENT_QUESTION;

	const handleSelect = async (optionId: string) => {
		const next = applyAnswer(answerState, currentQuestion.id, optionId);
		setAnswerState(next);

		// Changing Q1 swaps in a different question set, so re-read the length
		// rather than trusting the list rendered for the previous recipient.
		const nextQuestions = next.recipient
			? questionsFor(next.recipient)
			: [RECIPIENT_QUESTION];

		if (questionIndex < nextQuestions.length - 1) {
			setQuestionIndex(questionIndex + 1);
			return;
		}

		if (!next.recipient) return;
		setSaving(true);
		try {
			await submitInApp({
				recipient: next.recipient,
				answers: Object.entries(next.answers).map(([questionId, id]) => ({
					questionId,
					optionId: id,
				})),
				source: "web",
			});
			setShowResult(true);
		} catch (err) {
			toastMutationError(
				err,
				messageFromUnknownError(
					err,
					"Could not save your answers. Please try again.",
				),
			);
		} finally {
			setSaving(false);
		}
	};

	if (showResult && answerState.recipient) {
		const recipient = answerState.recipient;
		const result = resultFor(recipient, answerState.answers);
		return (
			<OnboardingShell>
				<ConfettiBurst />
				<motion.div
					initial={{ opacity: 0, y: 12 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.25, ease: "easeOut" }}
					// Short, celebratory screen — unlike the question list it reads
					// better centred, and the prose needs a sane measure rather than
					// the full 3/4-width column.
					className="mx-auto flex w-full max-w-[60ch] flex-col gap-4 lg:my-auto"
				>
					<h1 className="font-semibold text-2xl text-foreground leading-tight sm:text-3xl lg:text-4xl">
						{result.heading}
					</h1>
					{result.body.map((paragraph) => (
						<p
							key={paragraph.slice(0, 40)}
							className="text-muted-foreground leading-relaxed lg:text-lg"
						>
							{paragraph}
						</p>
					))}
					<Button
						size="lg"
						onClick={() => onFinish(recipient)}
						disabled={finishing}
						className="mt-4 w-full transition-all active:scale-[0.98] sm:w-fit sm:px-10"
					>
						{finishing ? "Just a moment..." : "Create your first journal"}
					</Button>
				</motion.div>
			</OnboardingShell>
		);
	}

	return (
		<OnboardingShell>
			<OnboardingQuestionStep
				question={currentQuestion}
				index={questionIndex + 1}
				selectedOptionId={answerState.answers[currentQuestion.id]}
				busy={saving}
				onSelect={(optionId) => void handleSelect(optionId)}
				onBack={
					questionIndex > 0
						? () => setQuestionIndex(questionIndex - 1)
						: undefined
				}
			/>
		</OnboardingShell>
	);
}
