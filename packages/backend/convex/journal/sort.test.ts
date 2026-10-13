import { describe, expect, test } from "vitest";

import {
	compareEntriesOldestFirst,
	DEFAULT_ENTRY_SORT,
	ENTRY_SORT_KEYS,
	ENTRY_SORTS,
	type EntrySortKey,
	isEntrySortKey,
	sortEntries,
} from "./sort";

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

describe("ENTRY_SORTS (the on-screen list order)", () => {
	// dateMs ascending is deliberately the reverse of creation order, so a sort
	// by the wrong field can't accidentally produce the right answer.
	const older = { dateMs: 100, _creationTime: 300 }; // oldest date, written last
	const middle = { dateMs: 200, _creationTime: 200 };
	const newer = { dateMs: 300, _creationTime: 100 }; // newest date, written first
	const all = [middle, newer, older];

	const by = (key: EntrySortKey) =>
		sortEntries(all, key).map((e) => e._creationTime);

	test("defaults to most recently added", () => {
		expect(DEFAULT_ENTRY_SORT).toBe("createdDesc");
		expect(by(DEFAULT_ENTRY_SORT)).toEqual([300, 200, 100]);
	});

	test("createdAsc is the reverse", () => {
		expect(by("createdAsc")).toEqual([100, 200, 300]);
	});

	test("dateAsc orders by the date the writer picked, not when they wrote it", () => {
		expect(sortEntries(all, "dateAsc").map((e) => e.dateMs)).toEqual([
			100, 200, 300,
		]);
	});

	test("dateDesc is the reverse", () => {
		expect(sortEntries(all, "dateDesc").map((e) => e.dateMs)).toEqual([
			300, 200, 100,
		]);
	});

	test("dateAsc is exactly the export order", () => {
		// The book is bound with this comparator, so the two must not drift.
		expect(ENTRY_SORTS.dateAsc.compare).toBe(compareEntriesOldestFirst);
	});

	test("sortEntries does not mutate its input", () => {
		const input = [...all];
		sortEntries(input, "dateAsc");
		expect(input).toEqual(all);
	});

	test("every advertised key has a comparator and a menu entry", () => {
		for (const key of ENTRY_SORT_KEYS) {
			expect(typeof ENTRY_SORTS[key].compare).toBe("function");
			expect(ENTRY_SORTS[key].label.length).toBeGreaterThan(0);
			expect(ENTRY_SORTS[key].group.length).toBeGreaterThan(0);
		}
		expect(ENTRY_SORT_KEYS).toHaveLength(Object.keys(ENTRY_SORTS).length);
	});

	test("isEntrySortKey rejects anything else", () => {
		expect(isEntrySortKey("createdDesc")).toBe(true);
		expect(isEntrySortKey("nonsense")).toBe(false);
	});
});
