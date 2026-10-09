import { describe, expect, test } from "vitest";

import { compareEntriesOldestFirst } from "./sort";

/** Minimal stand-in: the comparator only ever reads these two fields. */
function entry(dateMs: number, _creationTime = 0) {
	return { dateMs, _creationTime };
}

const order = (entries: ReturnType<typeof entry>[]) =>
	[...entries].sort(compareEntriesOldestFirst).map((e) => e.dateMs);

describe("compareEntriesOldestFirst", () => {
	test("puts the oldest entry first", () => {
		expect(order([entry(300), entry(100), entry(200)])).toEqual([
			100, 200, 300,
		]);
	});

	test("leaves an already-ordered list alone", () => {
		expect(order([entry(1), entry(2), entry(3)])).toEqual([1, 2, 3]);
	});

	test("reverses a newest-first list — the bug this replaced", () => {
		expect(order([entry(3), entry(2), entry(1)])).toEqual([1, 2, 3]);
	});

	test("breaks a shared date on creation time", () => {
		const sorted = [entry(500, 30), entry(500, 10), entry(500, 20)].sort(
			compareEntriesOldestFirst,
		);
		expect(sorted.map((e) => e._creationTime)).toEqual([10, 20, 30]);
	});

	test("date wins over creation time", () => {
		// Written second but dated earlier: the date is what the user chose, so
		// it decides where the entry sits.
		const older = entry(100, 999);
		const newer = entry(200, 1);
		expect([newer, older].sort(compareEntriesOldestFirst)).toEqual([
			older,
			newer,
		]);
	});

	test("is symmetric, so the sort is stable either way round", () => {
		const a = entry(100, 1);
		const b = entry(200, 2);
		expect(Math.sign(compareEntriesOldestFirst(a, b))).toBe(
			-Math.sign(compareEntriesOldestFirst(b, a)),
		);
		expect(compareEntriesOldestFirst(a, a)).toBe(0);
	});
});
