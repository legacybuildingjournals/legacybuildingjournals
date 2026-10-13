import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";

import { testModules } from "../../test/modules";
import { api } from "../_generated/api";
import schema from "../schema";
import {
	type AnswerRecord,
	questionsFor,
	RECIPIENT_QUESTION,
	type Recipient,
} from "./questions";

function setup() {
	return convexTest(schema, testModules);
}

/** A valid submission for `recipient`, answering each question with its first option. */
function answersFor(recipient: Recipient) {
	const record: AnswerRecord = {};
	for (const question of questionsFor(recipient)) {
		record[question.id] =
			question.id === RECIPIENT_QUESTION.id
				? recipient
				: (question.options[0]?.id ?? "");
	}
	return Object.entries(record).map(([questionId, optionId]) => ({
		questionId,
		optionId,
	}));
}

const CHILD_ANSWERS = answersFor("child");

type TestConvex = ReturnType<typeof setup>;

async function seedUser(
	t: TestConvex,
	clerkId: string,
	email: string,
): Promise<void> {
	await t.run(async (ctx) => {
		await ctx.db.insert("users", {
			clerkId,
			email,
			name: "Test User",
			role: "user",
		});
	});
}

function asUser(t: TestConvex, clerkId: string, email: string) {
	return t.withIdentity({ subject: clerkId, email });
}

async function allResponses(t: TestConvex) {
	return await t.run(async (ctx) =>
		ctx.db.query("onboardingResponses").collect(),
	);
}

describe("submitExternal", () => {
	test("stores one unlinked row and returns a token", async () => {
		const t = setup();
		const { token } = await t.mutation(
			api.onboarding.mutations.submitExternal,
			{
				email: "someone@example.com",
				recipient: "child",
				answers: CHILD_ANSWERS,
			},
		);

		expect(token).toHaveLength(32);
		const rows = await allResponses(t);
		expect(rows).toHaveLength(1);
		expect(rows[0]).toMatchObject({
			email: "someone@example.com",
			source: "external",
			recipient: "child",
		});
		expect(rows[0]?.clerkId).toBeUndefined();
		expect(rows[0]?.linkedAt).toBeUndefined();
	});

	test("normalizes the email", async () => {
		const t = setup();
		await t.mutation(api.onboarding.mutations.submitExternal, {
			email: "  Mixed.Case@Example.COM  ",
			recipient: "child",
			answers: CHILD_ANSWERS,
		});
		const rows = await allResponses(t);
		expect(rows[0]?.email).toBe("mixed.case@example.com");
	});

	test("rejects a malformed email", async () => {
		const t = setup();
		await expect(
			t.mutation(api.onboarding.mutations.submitExternal, {
				email: "not-an-email",
				recipient: "child",
				answers: CHILD_ANSWERS,
			}),
		).rejects.toThrow();
	});

	test("rejects an unknown recipient", async () => {
		const t = setup();
		await expect(
			t.mutation(api.onboarding.mutations.submitExternal, {
				email: "a@example.com",
				recipient: "nephew",
				answers: CHILD_ANSWERS,
			}),
		).rejects.toThrow();
	});

	test("rejects an incomplete answer set", async () => {
		const t = setup();
		await expect(
			t.mutation(api.onboarding.mutations.submitExternal, {
				email: "a@example.com",
				recipient: "child",
				answers: CHILD_ANSWERS.slice(0, 4),
			}),
		).rejects.toThrow();
	});

	test("rejects an unknown option id", async () => {
		const t = setup();
		const answers = CHILD_ANSWERS.map((a) =>
			a.questionId === "why" ? { ...a, optionId: "bogus" } : a,
		);
		await expect(
			t.mutation(api.onboarding.mutations.submitExternal, {
				email: "a@example.com",
				recipient: "child",
				answers,
			}),
		).rejects.toThrow();
	});

	test("rejects a duplicate answer to the same question", async () => {
		const t = setup();
		await expect(
			t.mutation(api.onboarding.mutations.submitExternal, {
				email: "a@example.com",
				recipient: "child",
				answers: [
					...CHILD_ANSWERS,
					{ questionId: "why", optionId: "everything" },
				],
			}),
		).rejects.toThrow();
	});

	test("rejects answers belonging to a different variant", async () => {
		// The "went back and changed Q1 without clearing" case.
		const t = setup();
		const answers = answersFor("myself").map((a) =>
			a.questionId === "why" ? { ...a, optionId: "preserve_childhood" } : a,
		);
		await expect(
			t.mutation(api.onboarding.mutations.submitExternal, {
				email: "a@example.com",
				recipient: "myself",
				answers,
			}),
		).rejects.toThrow();
	});

	test("re-submitting the same email updates in place and keeps the token", async () => {
		const t = setup();
		const first = await t.mutation(api.onboarding.mutations.submitExternal, {
			email: "repeat@example.com",
			recipient: "child",
			answers: CHILD_ANSWERS,
		});
		const second = await t.mutation(api.onboarding.mutations.submitExternal, {
			email: "repeat@example.com",
			recipient: "partner",
			answers: answersFor("partner"),
		});

		expect(second.token).toBe(first.token);
		const rows = await allResponses(t);
		expect(rows).toHaveLength(1);
		expect(rows[0]?.recipient).toBe("partner");
	});

	test("never mutates a row that is already claimed", async () => {
		const t = setup();
		await seedUser(t, "clerk_owner", "owner@example.com");
		await asUser(t, "clerk_owner", "owner@example.com").mutation(
			api.onboarding.mutations.submitInApp,
			{ recipient: "child", answers: CHILD_ANSWERS, source: "ios" },
		);

		await t.mutation(api.onboarding.mutations.submitExternal, {
			email: "owner@example.com",
			recipient: "partner",
			answers: answersFor("partner"),
		});

		const rows = await allResponses(t);
		expect(rows).toHaveLength(2);
		const claimed = rows.find((r) => r.clerkId === "clerk_owner");
		expect(claimed?.recipient).toBe("child");
	});
});

describe("submitInApp", () => {
	test("rejects an anonymous caller", async () => {
		const t = setup();
		await expect(
			t.mutation(api.onboarding.mutations.submitInApp, {
				recipient: "child",
				answers: CHILD_ANSWERS,
				source: "ios",
			}),
		).rejects.toThrow();
	});

	test("stores a row already linked to the caller", async () => {
		const t = setup();
		await seedUser(t, "clerk_a", "a@example.com");
		await asUser(t, "clerk_a", "a@example.com").mutation(
			api.onboarding.mutations.submitInApp,
			{ recipient: "child", answers: CHILD_ANSWERS, source: "ios" },
		);

		const rows = await allResponses(t);
		expect(rows).toHaveLength(1);
		expect(rows[0]).toMatchObject({
			clerkId: "clerk_a",
			email: "a@example.com",
			source: "ios",
		});
		expect(rows[0]?.linkedAt).toBeTypeOf("number");
	});

	test("submitting twice updates rather than duplicating", async () => {
		const t = setup();
		await seedUser(t, "clerk_a", "a@example.com");
		const user = asUser(t, "clerk_a", "a@example.com");

		await user.mutation(api.onboarding.mutations.submitInApp, {
			recipient: "child",
			answers: CHILD_ANSWERS,
			source: "ios",
		});
		await user.mutation(api.onboarding.mutations.submitInApp, {
			recipient: "myself",
			answers: answersFor("myself"),
			source: "ios",
		});

		const rows = await allResponses(t);
		expect(rows).toHaveLength(1);
		expect(rows[0]?.recipient).toBe("myself");
	});
});

describe("claimOnboarding", () => {
	test("token wins even when the signup email differs", async () => {
		// The case the whole design rests on: someone fills the external form with
		// one address, then signs up with another. The token carries the link.
		const t = setup();
		const { token } = await t.mutation(
			api.onboarding.mutations.submitExternal,
			{
				email: "typed-into-form@example.com",
				recipient: "child",
				answers: CHILD_ANSWERS,
			},
		);

		await seedUser(t, "clerk_b", "actually-signed-up-with@example.com");
		const result = await asUser(
			t,
			"clerk_b",
			"actually-signed-up-with@example.com",
		).mutation(api.onboarding.mutations.claimOnboarding, { token });

		expect(result.status).toBe("claimed");
		const rows = await allResponses(t);
		expect(rows[0]?.clerkId).toBe("clerk_b");
	});

	test("claims by token when the emails agree", async () => {
		const t = setup();
		const { token } = await t.mutation(
			api.onboarding.mutations.submitExternal,
			{
				email: "same@example.com",
				recipient: "child",
				answers: CHILD_ANSWERS,
			},
		);
		await seedUser(t, "clerk_c", "same@example.com");

		const result = await asUser(t, "clerk_c", "same@example.com").mutation(
			api.onboarding.mutations.claimOnboarding,
			{ token },
		);
		expect(result.status).toBe("claimed");
	});

	test("falls back to the email when no token is supplied", async () => {
		// The App Store path: nothing survives the install but the address.
		const t = setup();
		await t.mutation(api.onboarding.mutations.submitExternal, {
			email: "mobile@example.com",
			recipient: "child",
			answers: CHILD_ANSWERS,
		});
		await seedUser(t, "clerk_d", "mobile@example.com");

		const result = await asUser(t, "clerk_d", "mobile@example.com").mutation(
			api.onboarding.mutations.claimOnboarding,
			{},
		);
		expect(result.status).toBe("claimed");
		const rows = await allResponses(t);
		expect(rows[0]?.clerkId).toBe("clerk_d");
	});

	test("a bad token still falls through to the email", async () => {
		const t = setup();
		await t.mutation(api.onboarding.mutations.submitExternal, {
			email: "fallback@example.com",
			recipient: "child",
			answers: CHILD_ANSWERS,
		});
		await seedUser(t, "clerk_e", "fallback@example.com");

		const result = await asUser(t, "clerk_e", "fallback@example.com").mutation(
			api.onboarding.mutations.claimOnboarding,
			{ token: "totally-made-up-token" },
		);
		expect(result.status).toBe("claimed");
	});

	test("matches on email before the Clerk webhook has written the user row", async () => {
		// The claim runs once on /welcome and is never retried, so if it needed
		// the users row it would silently lose the match whenever the webhook
		// landed late — and the person would answer the questionnaire again.
		// Deliberately no seedUser() here.
		const t = setup();
		await t.mutation(api.onboarding.mutations.submitExternal, {
			email: "nouserrow@example.com",
			recipient: "child",
			answers: CHILD_ANSWERS,
		});

		const result = await asUser(
			t,
			"clerk_no_row",
			"nouserrow@example.com",
		).mutation(api.onboarding.mutations.claimOnboarding, {});

		expect(result.status).toBe("claimed");
		const rows = await allResponses(t);
		expect(rows[0]?.clerkId).toBe("clerk_no_row");
	});

	test("returns none when nothing matches", async () => {
		const t = setup();
		await seedUser(t, "clerk_f", "nobody@example.com");
		const result = await asUser(t, "clerk_f", "nobody@example.com").mutation(
			api.onboarding.mutations.claimOnboarding,
			{},
		);
		expect(result.status).toBe("none");
	});

	test("returns already_linked and does not take a second row", async () => {
		const t = setup();
		await seedUser(t, "clerk_g", "g@example.com");
		const user = asUser(t, "clerk_g", "g@example.com");
		await user.mutation(api.onboarding.mutations.submitInApp, {
			recipient: "child",
			answers: CHILD_ANSWERS,
			source: "ios",
		});

		const { token } = await t.mutation(
			api.onboarding.mutations.submitExternal,
			{
				email: "someone-else@example.com",
				recipient: "partner",
				answers: answersFor("partner"),
			},
		);

		const result = await user.mutation(
			api.onboarding.mutations.claimOnboarding,
			{ token },
		);
		expect(result.status).toBe("already_linked");

		const rows = await allResponses(t);
		expect(rows.filter((r) => r.clerkId === "clerk_g")).toHaveLength(1);
		expect(rows.find((r) => r.token === token)?.clerkId).toBeUndefined();
	});

	test("will not steal a row already claimed by someone else", async () => {
		const t = setup();
		await seedUser(t, "clerk_owner", "owner@example.com");
		await seedUser(t, "clerk_thief", "thief@example.com");

		const { token } = await t.mutation(
			api.onboarding.mutations.submitExternal,
			{
				email: "owner@example.com",
				recipient: "child",
				answers: CHILD_ANSWERS,
			},
		);
		await asUser(t, "clerk_owner", "owner@example.com").mutation(
			api.onboarding.mutations.claimOnboarding,
			{ token },
		);

		const result = await asUser(t, "clerk_thief", "thief@example.com").mutation(
			api.onboarding.mutations.claimOnboarding,
			{ token },
		);
		expect(result.status).toBe("none");

		const rows = await allResponses(t);
		expect(rows.find((r) => r.token === token)?.clerkId).toBe("clerk_owner");
	});

	test("rejects an anonymous caller", async () => {
		const t = setup();
		await expect(
			t.mutation(api.onboarding.mutations.claimOnboarding, {}),
		).rejects.toThrow();
	});
});

/**
 * End-to-end journeys, asserted the way the product asks the question: after
 * all this, does `myResponse` return answers — i.e. are the questions skipped?
 *
 * The blocks above cover each mutation in isolation; these cover the
 * compositions people actually walk through, where a regression would show up
 * as someone being made to answer the questionnaire twice.
 */
describe("journeys: the questionnaire is never asked twice", () => {
	/** What both welcome flows read to decide whether to show the questions. */
	async function seesQuestions(
		t: TestConvex,
		clerkId: string,
		email: string,
	): Promise<boolean> {
		const response = await asUser(t, clerkId, email).query(
			api.onboarding.queries.myResponse,
			{},
		);
		return response === null;
	}

	test("existing account fills the form, then opens the app", async () => {
		const t = setup();
		await seedUser(t, "clerk_existing", "existing@example.com");

		// Already registered, but never answered the questionnaire.
		expect(
			await seesQuestions(t, "clerk_existing", "existing@example.com"),
		).toBe(true);

		await t.mutation(api.onboarding.mutations.submitExternal, {
			email: "existing@example.com",
			recipient: "child",
			answers: CHILD_ANSWERS,
		});

		const result = await asUser(
			t,
			"clerk_existing",
			"existing@example.com",
		).mutation(api.onboarding.mutations.claimOnboarding, {});

		expect(result.status).toBe("claimed");
		expect(
			await seesQuestions(t, "clerk_existing", "existing@example.com"),
		).toBe(false);
	});

	test("no account, fills the form, signs up via the web link (token)", async () => {
		const t = setup();
		const { token } = await t.mutation(
			api.onboarding.mutations.submitExternal,
			{
				email: "tokenpath@example.com",
				recipient: "child",
				answers: CHILD_ANSWERS,
			},
		);

		// Signs up afterwards, so the row is written only now.
		await seedUser(t, "clerk_token", "tokenpath@example.com");
		const result = await asUser(
			t,
			"clerk_token",
			"tokenpath@example.com",
		).mutation(api.onboarding.mutations.claimOnboarding, { token });

		expect(result.status).toBe("claimed");
		expect(await seesQuestions(t, "clerk_token", "tokenpath@example.com")).toBe(
			false,
		);
	});

	test("no account, fills the form, installs the app and signs up (email only)", async () => {
		const t = setup();
		await t.mutation(api.onboarding.mutations.submitExternal, {
			email: "storepath@example.com",
			recipient: "child",
			answers: CHILD_ANSWERS,
		});

		// No token survives an App Store install, so the email is all there is.
		await seedUser(t, "clerk_store", "storepath@example.com");
		const result = await asUser(
			t,
			"clerk_store",
			"storepath@example.com",
		).mutation(api.onboarding.mutations.claimOnboarding, {});

		expect(result.status).toBe("claimed");
		expect(await seesQuestions(t, "clerk_store", "storepath@example.com")).toBe(
			false,
		);
	});

	test("signs up with a different email than the form, carrying the token", async () => {
		const t = setup();
		const { token } = await t.mutation(
			api.onboarding.mutations.submitExternal,
			{
				email: "typed@example.com",
				recipient: "child",
				answers: CHILD_ANSWERS,
			},
		);

		await seedUser(t, "clerk_diff", "actually-signed-up@example.com");
		const result = await asUser(
			t,
			"clerk_diff",
			"actually-signed-up@example.com",
		).mutation(api.onboarding.mutations.claimOnboarding, { token });

		expect(result.status).toBe("claimed");
		expect(
			await seesQuestions(t, "clerk_diff", "actually-signed-up@example.com"),
		).toBe(false);
	});

	test("answers in-app on web, then opens the native app", async () => {
		const t = setup();
		await seedUser(t, "clerk_web", "webfirst@example.com");

		await asUser(t, "clerk_web", "webfirst@example.com").mutation(
			api.onboarding.mutations.submitInApp,
			{ recipient: "child", answers: CHILD_ANSWERS, source: "web" },
		);

		// Native reads the same linked row; no claim is involved.
		expect(await seesQuestions(t, "clerk_web", "webfirst@example.com")).toBe(
			false,
		);
	});

	test("an unclaimed form row does not shadow answers given in-app", async () => {
		const t = setup();
		await t.mutation(api.onboarding.mutations.submitExternal, {
			email: "both@example.com",
			recipient: "partner",
			answers: answersFor("partner"),
		});
		await seedUser(t, "clerk_both", "both@example.com");

		// Answers in-app without ever claiming the form row.
		await asUser(t, "clerk_both", "both@example.com").mutation(
			api.onboarding.mutations.submitInApp,
			{ recipient: "child", answers: CHILD_ANSWERS, source: "web" },
		);

		const response = await asUser(t, "clerk_both", "both@example.com").query(
			api.onboarding.queries.myResponse,
			{},
		);
		// The in-app answers win: they are the linked row.
		expect(response?.recipient).toBe("child");
	});

	test("re-filling the form after claiming leaves the claimed answers alone", async () => {
		const t = setup();
		await t.mutation(api.onboarding.mutations.submitExternal, {
			email: "refill@example.com",
			recipient: "child",
			answers: CHILD_ANSWERS,
		});
		await seedUser(t, "clerk_refill", "refill@example.com");
		await asUser(t, "clerk_refill", "refill@example.com").mutation(
			api.onboarding.mutations.claimOnboarding,
			{},
		);

		// Walks the public form again with the same address.
		await t.mutation(api.onboarding.mutations.submitExternal, {
			email: "refill@example.com",
			recipient: "myself",
			answers: answersFor("myself"),
		});

		const second = await asUser(
			t,
			"clerk_refill",
			"refill@example.com",
		).mutation(api.onboarding.mutations.claimOnboarding, {});
		expect(second.status).toBe("already_linked");

		const response = await asUser(
			t,
			"clerk_refill",
			"refill@example.com",
		).query(api.onboarding.queries.myResponse, {});
		expect(response?.recipient).toBe("child");
		expect(await seesQuestions(t, "clerk_refill", "refill@example.com")).toBe(
			false,
		);
	});

	test("claiming twice is harmless", async () => {
		const t = setup();
		await t.mutation(api.onboarding.mutations.submitExternal, {
			email: "twice@example.com",
			recipient: "child",
			answers: CHILD_ANSWERS,
		});
		await seedUser(t, "clerk_twice", "twice@example.com");

		const as = asUser(t, "clerk_twice", "twice@example.com");
		expect(
			(await as.mutation(api.onboarding.mutations.claimOnboarding, {})).status,
		).toBe("claimed");
		expect(
			(await as.mutation(api.onboarding.mutations.claimOnboarding, {})).status,
		).toBe("already_linked");

		const rows = await allResponses(t);
		expect(rows.filter((r) => r.clerkId === "clerk_twice")).toHaveLength(1);
	});
});
