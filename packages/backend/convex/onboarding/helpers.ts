import { ConvexError } from "convex/values";

import {
	type AnswerRecord,
	isCompleteAnswerSet,
	isRecipient,
	type Recipient,
} from "./questions";

/**
 * Claim tokens only ever travel in a URL, never read aloud, so unlike invite
 * codes they optimise for entropy over legibility. 32 chars of a 32-char
 * alphabet is 160 bits — brute-forcing one to hijack a stranger's answers is
 * not a realistic attack.
 */
const TOKEN_ALPHABET = "abcdefghijklmnopqrstuvwxyz234567";
const TOKEN_LENGTH = 32;

export function generateClaimToken(): string {
	const bytes = new Uint8Array(TOKEN_LENGTH);
	crypto.getRandomValues(bytes);
	let token = "";
	for (const byte of bytes) {
		token += TOKEN_ALPHABET[byte % TOKEN_ALPHABET.length];
	}
	return token;
}

export function normalizeEmail(email: string): string {
	return email.trim().toLowerCase();
}

/** Deliberately permissive — Clerk is the real authority on deliverability. */
export function isPlausibleEmail(email: string): boolean {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

export type SubmittedAnswer = { questionId: string; optionId: string };

/**
 * Validates a submission against the shared question config and returns the
 * answers as a record.
 *
 * The important case is a client that let the user go back and change Q1
 * without clearing the later answers: those option ids belong to a different
 * variant's question set and are rejected here rather than persisted.
 */
export function validateSubmission(
	recipient: string,
	answers: SubmittedAnswer[],
): { recipient: Recipient; answers: AnswerRecord } {
	if (!isRecipient(recipient)) {
		throw new ConvexError({
			code: "INVALID_ARGUMENT",
			message: "That isn't a valid answer to the first question.",
		});
	}

	const record: AnswerRecord = {};
	for (const answer of answers) {
		if (record[answer.questionId] !== undefined) {
			throw new ConvexError({
				code: "INVALID_ARGUMENT",
				message: "Each question can only be answered once.",
			});
		}
		record[answer.questionId] = answer.optionId;
	}

	if (!isCompleteAnswerSet(recipient, record)) {
		throw new ConvexError({
			code: "INVALID_ARGUMENT",
			message: "Please answer every question before continuing.",
		});
	}

	return { recipient, answers: record };
}

export function toAnswerList(answers: AnswerRecord): SubmittedAnswer[] {
	return Object.entries(answers).map(([questionId, optionId]) => ({
		questionId,
		optionId,
	}));
}
