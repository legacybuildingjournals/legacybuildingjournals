/**
 * Completion-screen copy.
 *
 * The Figma completion screen is a fixed template: a heading, one narrative
 * sentence, and a block of static reassurance copy. Only two things vary — the
 * recipient, and how the person said they'd capture memories (Q6), which is the
 * phrase the design's own example ("in your own voice") is built around.
 */

import type { AnswerRecord, Recipient } from "./questions";

export type OnboardingResult = {
	heading: string;
	/** The single personalised sentence under the sub-heading. */
	narrative: string;
};

/** Q6 answer -> how it reads inside the narrative sentence. */
const CAPTURE_PROSE: Record<string, string> = {
	writing: "in writing",
	voice: "in your own voice",
	video: "on video",
	combination: "in your own way",
};

function captureProse(answers: AnswerRecord): string {
	return CAPTURE_PROSE[answers.capture ?? ""] ?? "in your own way";
}

/**
 * Child is verbatim from Figma. The other four headings are not designed — that
 * frame still carries the placeholder "…record for later generation" — so they
 * are written to the same pattern.
 */
const HEADINGS: Record<Recipient, string> = {
	child: "You’re creating more than a\nrecord of childhood",
	grandchild: "Some stories only you can tell",
	partner: "The story of you two, in your own words",
	other: "Some people deserve more than a passing mention",
	myself: "Your story is happening right now",
};

const NARRATIVES: Record<Recipient, (capture: string) => string> = {
	child: (capture) =>
		`Capturing them ${capture} creates something personal your children can carry with them into the future.`,
	grandchild: (capture) =>
		`Capturing them ${capture} creates something personal your grandchildren can carry with them into the future.`,
	partner: (capture) =>
		`Capturing your story together ${capture} creates something personal the two of you can look back on for years to come.`,
	other: (capture) =>
		`Capturing them ${capture} creates something personal they can carry with them into the future.`,
	myself: (capture) =>
		`Capturing your story ${capture} creates something personal you can look back on for years to come.`,
};

export function resultFor(
	recipient: Recipient,
	answers: AnswerRecord,
): OnboardingResult {
	return {
		heading: HEADINGS[recipient],
		narrative: NARRATIVES[recipient](captureProse(answers)),
	};
}

/** The part of the completion screen that never changes. */
export const COMPLETION_STATIC = {
	subheading: "The everyday moments matter.",
	pills: ["Write", "Voice", "Video"],
	paragraph:
		"Legacy Building gives you a private place to preserve those stories as they happen through writing, voice, or video.",
	emphasis: "Start with one memory",
	emphasisTail: "and build from there.",
	lockNotice:
		"You'll create or open your Legacy Building account next. You won't have to take the questionnaire again.",
} as const;
