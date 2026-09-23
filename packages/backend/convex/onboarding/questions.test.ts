import { describe, expect, test } from "vitest";

import {
	type AnswerRecord,
	applyAnswer,
	EMPTY_ANSWER_STATE,
	isCompleteAnswerSet,
	journalTypeForRecipient,
	OPTION_ICONS,
	OPTION_TINTS,
	QUESTION_SETS,
	QUESTION_SLOTS,
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

	test("every option has a unique id, a label, an icon and a valid tint", () => {
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
				expect(OPTION_TINTS).toContain(option.tint);
			}
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

	test("produces a result with no unresolved interpolation", () => {
		const result = resultFor(recipient, completeAnswers(recipient));
		expect(result.heading.trim()).not.toBe("");
		expect(result.body.length).toBeGreaterThan(0);
		for (const paragraph of result.body) {
			// An unmatched option id yields an empty phrase, which shows up as a
			// doubled space or a dangling comma rather than throwing.
			expect(paragraph).not.toMatch(/\s{2,}/);
			expect(paragraph).not.toMatch(/\s,|,\s*\./);
			expect(paragraph).not.toContain("undefined");
		}
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
