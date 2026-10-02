import { api } from "@legacy-building/backend/convex/_generated/api";
import {
	type AnswerState,
	applyAnswer,
	EMPTY_ANSWER_STATE,
	questionsFor,
	RECIPIENT_QUESTION,
	type Recipient,
} from "@legacy-building/backend/convex/onboarding/questions";
import { useMutation } from "convex/react";
import { useState } from "react";
import { PILL_PRIMARY } from "@/components/onboarding/onboarding-card";
import { OnboardingCompletion } from "@/components/onboarding/onboarding-completion";
import { OnboardingIntro } from "@/components/onboarding/onboarding-intro";
import { OnboardingQuestionStep } from "@/components/onboarding/onboarding-question-step";
import {
	OnboardingColumn,
	OnboardingShell,
	OnboardingTopBar,
} from "@/components/onboarding/onboarding-shell";
import {
	messageFromUnknownError,
	toastMutationError,
} from "@/lib/journal/toast";

type Phase = "intro" | "questions" | "result";

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

	const [phase, setPhase] = useState<Phase>("intro");
	const [answerState, setAnswerState] =
		useState<AnswerState>(EMPTY_ANSWER_STATE);
	const [questionIndex, setQuestionIndex] = useState(0);
	const [saving, setSaving] = useState(false);

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
			setPhase("result");
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

	if (phase === "intro") {
		return <OnboardingIntro onStart={() => setPhase("questions")} />;
	}

	if (phase === "result" && answerState.recipient) {
		const recipient = answerState.recipient;
		return (
			<OnboardingCompletion
				recipient={recipient}
				answers={answerState.answers}
				actions={
					<button
						type="button"
						onClick={() => onFinish(recipient)}
						disabled={finishing}
						className={PILL_PRIMARY}
					>
						{finishing ? "Just a moment..." : "Start Building Your Legacy"}
					</button>
				}
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
					busy={saving}
					onSelect={(optionId) => void handleSelect(optionId)}
					onBack={
						questionIndex > 0
							? () => setQuestionIndex(questionIndex - 1)
							: undefined
					}
				/>
			</OnboardingColumn>
		</OnboardingShell>
	);
}
