import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";

import { testModules } from "../../test/modules";
import { api } from "../_generated/api";
import schema from "../schema";
import { questionsFor, RECIPIENT_QUESTION } from "./questions";

const CHILD_ANSWERS = questionsFor("child").map((question) => ({
	questionId: question.id,
	optionId:
		question.id === RECIPIENT_QUESTION.id
			? "child"
			: (question.options[0]?.id ?? ""),
}));

describe("myResponse", () => {
	test("returns null for an anonymous caller rather than throwing", async () => {
		// Both welcome flows query this while auth is still settling.
		const t = convexTest(schema, testModules);
		await expect(
			t.query(api.onboarding.queries.myResponse, {}),
		).resolves.toBeNull();
	});

	test("returns null when the user has no response", async () => {
		const t = convexTest(schema, testModules);
		await t.run(async (ctx) => {
			await ctx.db.insert("users", {
				clerkId: "clerk_none",
				email: "none@example.com",
				name: "Test User",
				role: "user",
			});
		});

		const result = await t
			.withIdentity({ subject: "clerk_none", email: "none@example.com" })
			.query(api.onboarding.queries.myResponse, {});
		expect(result).toBeNull();
	});

	test("returns the answers once a response is linked", async () => {
		const t = convexTest(schema, testModules);
		await t.run(async (ctx) => {
			await ctx.db.insert("users", {
				clerkId: "clerk_has",
				email: "has@example.com",
				name: "Test User",
				role: "user",
			});
		});

		const user = t.withIdentity({
			subject: "clerk_has",
			email: "has@example.com",
		});
		await user.mutation(api.onboarding.mutations.submitInApp, {
			recipient: "child",
			answers: CHILD_ANSWERS,
			source: "ios",
		});

		const result = await user.query(api.onboarding.queries.myResponse, {});
		expect(result?.recipient).toBe("child");
		expect(result?.answers).toHaveLength(CHILD_ANSWERS.length);
	});

	test("does not leak another user's response", async () => {
		const t = convexTest(schema, testModules);
		await t.run(async (ctx) => {
			await ctx.db.insert("users", {
				clerkId: "clerk_owner",
				email: "owner@example.com",
				name: "Owner",
				role: "user",
			});
			await ctx.db.insert("users", {
				clerkId: "clerk_other",
				email: "other@example.com",
				name: "Other",
				role: "user",
			});
		});

		await t
			.withIdentity({ subject: "clerk_owner", email: "owner@example.com" })
			.mutation(api.onboarding.mutations.submitInApp, {
				recipient: "child",
				answers: CHILD_ANSWERS,
				source: "ios",
			});

		const result = await t
			.withIdentity({ subject: "clerk_other", email: "other@example.com" })
			.query(api.onboarding.queries.myResponse, {});
		expect(result).toBeNull();
	});
});
