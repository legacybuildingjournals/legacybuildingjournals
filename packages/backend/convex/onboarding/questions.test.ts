import { describe, expect, test } from "vitest";

import {
	type AnswerRecord,
	applyAnswer,
	EMPTY_ANSWER_STATE,
	isCompleteAnswerSet,
	journalTypeForRecipient,
	OPTION_ICONS,
	QUESTION_SETS,
	QUESTION_SLOTS,
	type QuestionSlot,
	questionsFor,
	RECIPIENT_QUESTION,
	RECIPIENTS,
	type Recipient,
	TOTAL_QUESTIONS,
} from "./questions";
import { resultFor } from "./results";

/** Answers every question with its first option. */
function completeAnswers(recipient: Recipient): AnswerRecord {
	const answers: AnswerRecord = {};
	for (const question of questionsFor(recipient)) {
		answers[question.id] =
			question.id === RECIPIENT_QUESTION.id
				? recipient
				: (question.options[0]?.id ?? "");
	}
	return answers;
}

describe("Q1", () => {
	test("its options map one-to-one onto RECIPIENTS", () => {
		const optionIds = RECIPIENT_QUESTION.options.map((o) => o.id).sort();
		expect(optionIds).toEqual([...RECIPIENTS].sort());
	});
});

describe.each(RECIPIENTS)("%s variant", (recipient) => {
	const questions = QUESTION_SETS[recipient];

	test(`has ${TOTAL_QUESTIONS - 1} questions after Q1`, () => {
		expect(questions).toHaveLength(TOTAL_QUESTIONS - 1);
		expect(questionsFor(recipient)).toHaveLength(TOTAL_QUESTIONS);
	});

	test("fills each slot exactly once", () => {
		expect(questions.map((q) => q.slot)).toEqual([...QUESTION_SLOTS]);
	});

	test("question ids are unique", () => {
		const ids = questions.map((q) => q.id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	test("every option has a unique id, a label and a known icon", () => {
		for (const question of questions) {
			const ids = question.options.map((o) => o.id);
			expect(new Set(ids).size, `duplicate option id in ${question.id}`).toBe(
				ids.length,
			);

			for (const option of question.options) {
				expect(option.label.trim()).not.toBe("");
				// Both clients key their own icon maps off these, so an unknown one
				// renders nothing rather than failing loudly at runtime.
				expect(OPTION_ICONS).toContain(option.icon);
			}
		}
	});

	test("assigns icons by position, matching the Figma sequence", () => {
		for (const question of questions) {
			expect(
				question.options.map((o) => o.icon),
				`icons for ${question.id}`,
			).toEqual(
				FIGMA_ICON_SEQUENCE[question.slot as QuestionSlot].slice(
					0,
					question.options.length,
				),
			);
		}
	});

	test("carries the recipient's eyebrow on every question", () => {
		for (const question of questions) {
			expect(
				question.eyebrow,
				`missing eyebrow on ${question.id}`,
			).toBeTruthy();
		}
	});

	test("Q2-Q5 end with 'A little of everything'", () => {
		for (const question of questions.filter((q) =>
			["why", "what", "meaning", "value"].includes(q.slot),
		)) {
			const last = question.options.at(-1);
			expect(last?.id, `${question.id} should end with the catch-all`).toBe(
				"everything",
			);
		}
	});

	test("produces a completion result with no unresolved interpolation", () => {
		const result = resultFor(recipient, completeAnswers(recipient));
		expect(result.heading.trim()).not.toBe("");
		expect(result.narrative.trim()).not.toBe("");
		for (const text of [result.heading, result.narrative]) {
			expect(text).not.toMatch(/\s{2,}/);
			expect(text).not.toMatch(/\s,|,\s*\./);
			expect(text).not.toContain("undefined");
		}
	});
});

/** Icon per row, per slot, read off the Figma frames. */
const FIGMA_ICON_SEQUENCE: Record<QuestionSlot, string[]> = {
	why: ["smile", "chat", "idea", "home", "gift", "everything"],
	what: ["trophy", "smile", "camera", "growth", "leaf", "everything"],
	meaning: ["heart", "eye", "clock", "chats", "school", "everything"],
	value: ["hourglass", "album", "chats", "gift", "growth", "everything"],
	how: ["write", "mic", "video", "mix"],
	confirmation: ["heartPulse", "sparkle", "compass", "question"],
};

function labelsFor(recipient: Recipient, questionId: string): string[] {
	const question = questionsFor(recipient).find((q) => q.id === questionId);
	return question?.options.map((o) => o.label) ?? [];
}

describe("Figma copy", () => {
	test("prompts match the designs", () => {
		const prompts = Object.fromEntries(
			questionsFor("child").map((q) => [q.id, q.prompt]),
		);
		expect(prompts).toMatchObject({
			recipient: "Who would you want to create a journal for?",
			why: "What would be the biggest reason for keeping this journal?",
			what: "What kinds of moments should this journal capture?",
			meaning: "Years from now, what should these journals communicate?",
			value: "What would make these journals feel meaningful?",
			capture:
				"What would feel natural for capturing these stories and memories?",
			confirmation:
				"How would it feel knowing these stories and memories were being preserved for the future?",
		});
	});

	test("eyebrows match the designs", () => {
		const eyebrow = (r: Recipient) => QUESTION_SETS[r][0]?.eyebrow;
		expect(eyebrow("child")).toBe("CREATING FOR YOUR CHILDREN");
		expect(eyebrow("partner")).toBe("CREATING FOR MY PARTNER");
		expect(eyebrow("other")).toBe("CREATING FOR SOMEONE SPECIAL");
		expect(eyebrow("myself")).toBe("CREATING FOR MYSELF");
	});

	test("Q2 options match the designed variants", () => {
		expect(labelsFor("child", "why")).toEqual([
			"Preserving their childhood",
			"Sharing my thoughts and feelings with them",
			"Passing along lessons and advice",
			"Helping them understand our family's story",
			"Giving them something personal from me",
			"A little of everything",
		]);
		expect(labelsFor("partner", "why")).toEqual([
			"Preserving our shared memories",
			"Sharing my thoughts and feelings with them",
			"Passing along lessons and advice",
			"Capturing our story together",
			"Leaving something personal behind",
			"A little of everything",
		]);
		expect(labelsFor("myself", "why").slice(0, 4)).toEqual([
			"Preserving my memories",
			"Expressing my thoughts and feelings",
			"Recording lessons and advice",
			"Understanding my own story",
		]);
	});

	test("completion heading for child is verbatim, and narrative follows Q6", () => {
		const voice = { ...completeAnswers("child"), capture: "voice" };
		expect(resultFor("child", voice)).toEqual({
			heading: "You\u2019re creating more than a\nrecord of childhood",
			narrative:
				"Capturing them in your own voice creates something personal your children can carry with them into the future.",
		});
		const writing = { ...completeAnswers("child"), capture: "writing" };
		expect(resultFor("child", writing).narrative).toContain("in writing");
		const video = { ...completeAnswers("child"), capture: "video" };
		expect(resultFor("child", video).narrative).toContain("on video");
	});
});

describe("shared questions", () => {
	test("Q7 is identical across every variant", () => {
		const serialized = RECIPIENTS.map((recipient) => {
			const question = QUESTION_SETS[recipient].find(
				(q) => q.slot === "confirmation",
			);
			return JSON.stringify({
				prompt: question?.prompt,
				options: question?.options,
			});
		});
		expect(new Set(serialized).size).toBe(1);
	});

	test("Q6 offers the same options everywhere, though its prompt differs", () => {
		const optionSets = RECIPIENTS.map((recipient) =>
			JSON.stringify(
				QUESTION_SETS[recipient].find((q) => q.slot === "how")?.options,
			),
		);
		expect(new Set(optionSets).size).toBe(1);
	});
});

describe("journalTypeForRecipient", () => {
	test("only 'myself' maps to my_story", () => {
		expect(journalTypeForRecipient("myself")).toBe("my_story");
		for (const recipient of RECIPIENTS.filter((r) => r !== "myself")) {
			expect(journalTypeForRecipient(recipient)).toBe("their_story");
		}
	});
});

describe("applyAnswer", () => {
	test("records Q1 and sets the recipient", () => {
		const state = applyAnswer(EMPTY_ANSWER_STATE, "recipient", "child");
		expect(state.recipient).toBe("child");
		expect(state.answers.recipient).toBe("child");
	});

	test("ignores an invalid recipient", () => {
		const state = applyAnswer(EMPTY_ANSWER_STATE, "recipient", "nephew");
		expect(state).toBe(EMPTY_ANSWER_STATE);
	});

	test("records later answers without disturbing earlier ones", () => {
		let state = applyAnswer(EMPTY_ANSWER_STATE, "recipient", "child");
		state = applyAnswer(state, "why", "preserve_childhood");
		state = applyAnswer(state, "what", "everyday");
		expect(state.answers).toEqual({
			recipient: "child",
			why: "preserve_childhood",
			what: "everyday",
		});
	});

	test("re-picking the same recipient keeps existing answers", () => {
		// Paging back to Q1 and confirming the same choice must not wipe progress.
		let state = applyAnswer(EMPTY_ANSWER_STATE, "recipient", "child");
		state = applyAnswer(state, "why", "preserve_childhood");
		const after = applyAnswer(state, "recipient", "child");
		expect(after.answers.why).toBe("preserve_childhood");
	});

	test("changing the recipient discards the other variant's answers", () => {
		let state = applyAnswer(EMPTY_ANSWER_STATE, "recipient", "child");
		state = applyAnswer(state, "why", "preserve_childhood");
		state = applyAnswer(state, "what", "everyday");

		const after = applyAnswer(state, "recipient", "myself");
		expect(after.recipient).toBe("myself");
		expect(after.answers).toEqual({ recipient: "myself" });
	});

	test("a full run through applyAnswer produces a submittable set", () => {
		for (const recipient of RECIPIENTS) {
			let state = applyAnswer(EMPTY_ANSWER_STATE, "recipient", recipient);
			for (const question of QUESTION_SETS[recipient]) {
				state = applyAnswer(state, question.id, question.options[0]?.id ?? "");
			}
			expect(isCompleteAnswerSet(recipient, state.answers)).toBe(true);
		}
	});
});

describe("isCompleteAnswerSet", () => {
	test("accepts a full valid set", () => {
		for (const recipient of RECIPIENTS) {
			expect(isCompleteAnswerSet(recipient, completeAnswers(recipient))).toBe(
				true,
			);
		}
	});

	test("rejects a missing answer", () => {
		const answers = completeAnswers("child");
		delete answers.value;
		expect(isCompleteAnswerSet("child", answers)).toBe(false);
	});

	test("rejects an unknown question id", () => {
		const answers = { ...completeAnswers("child"), bogus: "whatever" };
		expect(isCompleteAnswerSet("child", answers)).toBe(false);
	});

	test("rejects an option that isn't offered for that question", () => {
		const answers = { ...completeAnswers("child"), why: "not-an-option" };
		expect(isCompleteAnswerSet("child", answers)).toBe(false);
	});

	test("rejects a Q1 answer that disagrees with the recipient", () => {
		const answers = { ...completeAnswers("child"), recipient: "partner" };
		expect(isCompleteAnswerSet("child", answers)).toBe(false);
	});

	test("rejects answers belonging to a different variant's question set", () => {
		// The "user went back and changed Q1" case: `preserve_childhood` exists for
		// `child` but not for `myself`.
		const answers = { ...completeAnswers("myself"), why: "preserve_childhood" };
		expect(isCompleteAnswerSet("myself", answers)).toBe(false);
	});
});
