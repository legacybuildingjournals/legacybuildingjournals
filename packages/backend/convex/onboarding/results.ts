/**
 * Personalized result screen shown once the questionnaire is finished.
 *
 * The body reflects the user's own answers back at them, so each variant is a
 * function of the answer record rather than fixed prose. Kept separate from
 * `questions.ts` because this is prose assembly, not question data.
 */

import { type AnswerRecord, answerPhrase, type Recipient } from "./questions";

export type OnboardingResult = {
	heading: string;
	body: string[];
};

/**
 * "A little of everything" is a valid answer to every question, but its label
 * doesn't survive being dropped into a sentence. Each slot gets a phrasing that
 * reads correctly in the templates below.
 */
const EVERYTHING_BY_SLOT: Record<string, string> = {
	why: "capture all of it",
	what: "a little of everything",
	meaning: "everything that matters",
	value: "all of it",
};

/** Capture answers need a preposition the option label doesn't carry. */
const CAPTURE_PROSE: Record<string, string> = {
	writing: "in writing",
	voice: "in your own voice",
	video: "on video",
	combination: "in a mix of ways",
};

/** Same answers as the subject of a sentence: "Writing feels most natural…". */
const CAPTURE_SUBJECT: Record<string, string> = {
	writing: "Writing",
	voice: "Your own voice",
	video: "Video",
	combination: "A mix of ways",
};

function phrase(
	recipient: Recipient,
	questionId: string,
	answers: AnswerRecord,
): string {
	if (answers[questionId] === "everything") {
		return EVERYTHING_BY_SLOT[questionId] ?? "a little of everything";
	}
	return answerPhrase(recipient, questionId, answers);
}

function capturePhrase(answers: AnswerRecord): string {
	return CAPTURE_PROSE[answers.capture ?? ""] ?? "in your own way";
}

/**
 * Shared closing line. `subject` is what the journal is built for, phrased from
 * the reader's side ("your children", "your story").
 */
function closing(answers: AnswerRecord, subject: string): string {
	return `Since you'd naturally capture them ${capturePhrase(answers)}, Legacy Building gives you a private place to record those stories as they happen and build something ${subject} can experience in the future.`;
}

export const RESULT_COPY: Record<
	Recipient,
	(answers: AnswerRecord) => OnboardingResult
> = {
	child: (answers) => ({
		heading: "You're creating more than a record of childhood.",
		body: [
			`You told us you want to ${phrase("child", "why", answers)}, especially ${phrase("child", "what", answers)} that can be easy to forget.`,
			`You want them to know ${phrase("child", "meaning", answers)}, and ${phrase("child", "value", answers)} feels meaningful to you.`,
			closing(answers, "your children"),
		],
	}),

	grandchild: (answers) => ({
		heading: "Some stories only you can tell.",
		body: [
			`You told us you want to ${phrase("grandchild", "why", answers)}, especially ${phrase("grandchild", "what", answers)} that can be easy to lose.`,
			`You want them to know ${phrase("grandchild", "meaning", answers)}, and ${phrase("grandchild", "value", answers)} feels meaningful to you.`,
			closing(answers, "your grandchildren"),
		],
	}),

	partner: (answers) => ({
		heading: "The story of you two, in your own words.",
		body: [
			`You told us you want to ${phrase("partner", "why", answers)}, especially ${phrase("partner", "what", answers)} that are easy to let pass by.`,
			`You want them to know ${phrase("partner", "meaning", answers)}, and ${phrase("partner", "value", answers)} feels meaningful to you.`,
			closing(answers, "the two of you"),
		],
	}),

	other: (answers) => ({
		heading: "Some people deserve more than a passing mention.",
		body: [
			`You told us you want to ${phrase("other", "why", answers)}, especially ${phrase("other", "what", answers)} that can be easy to forget.`,
			`You want them to know ${phrase("other", "meaning", answers)}, and ${phrase("other", "value", answers)} feels meaningful to you.`,
			closing(answers, "they"),
		],
	}),

	myself: (answers) => ({
		heading: "Your story is happening right now.",
		body: [
			`You told us you want to capture ${phrase("myself", "what", answers)}, remember ${phrase("myself", "meaning", answers)}, and have something you can look back on years from now.`,
			`${CAPTURE_SUBJECT[answers.capture ?? ""] ?? "Your own way"} feels most natural to you, so Legacy Building gives you a private place to record those experiences as they happen and build your story over time.`,
		],
	}),
};

export function resultFor(
	recipient: Recipient,
	answers: AnswerRecord,
): OnboardingResult {
	return RESULT_COPY[recipient](answers);
}
