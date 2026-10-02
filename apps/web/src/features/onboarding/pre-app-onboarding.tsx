import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "@legacy-building/backend/convex/_generated/api";
import {
	type AnswerState,
	applyAnswer,
	EMPTY_ANSWER_STATE,
	questionsFor,
	RECIPIENT_QUESTION,
} from "@legacy-building/backend/convex/onboarding/questions";
import { useMutation } from "convex/react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { OnboardingEmailStep } from "@/components/onboarding/onboarding-email-step";
import { OnboardingIntro } from "@/components/onboarding/onboarding-intro";
import { OnboardingQuestionStep } from "@/components/onboarding/onboarding-question-step";
import {
	OnboardingColumn,
	OnboardingShell,
	OnboardingTopBar,
} from "@/components/onboarding/onboarding-shell";
import {
	type OnboardingEmailValues,
	onboardingEmailSchema,
} from "@/lib/onboarding/schemas";

import { OnboardingSuccess } from "./onboarding-success";

type Phase = "intro" | "questions" | "email" | "success";

/**
 * The external, pre-account onboarding form.
 *
 * Intro, then the seven questions, then the email last: asking for an address up
 * front is the step people bounce on, and the questions are what the product
 * actually needs. Nothing is written until the email step submits.
 */
export function PreAppOnboarding() {
	const submitExternal = useMutation(api.onboarding.mutations.submitExternal);

	const [phase, setPhase] = useState<Phase>("intro");
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

	if (phase === "intro") {
		return <OnboardingIntro onStart={() => setPhase("questions")} />;
	}

	if (phase === "email") {
		return (
			<OnboardingEmailStep
				form={form}
				onSubmit={onSubmit}
				onBack={() => setPhase("questions")}
			/>
		);
	}

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
			<OnboardingTopBar />
			<OnboardingColumn>
				<OnboardingQuestionStep
					question={currentQuestion}
					index={questionIndex + 1}
					selectedOptionId={answerState.answers[currentQuestion.id]}
					busy={false}
					onSelect={handleSelect}
					onBack={questionIndex > 0 ? handleBack : undefined}
				/>
			</OnboardingColumn>
		</OnboardingShell>
	);
}
