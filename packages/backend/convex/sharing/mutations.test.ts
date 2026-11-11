import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { testModules } from "../../test/modules";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import schema from "../schema";

function setup() {
	return convexTest(schema, testModules);
}
type TestConvex = ReturnType<typeof setup>;

const AUTHOR = { subject: "user_author", email: "author@example.com" };
const MEMBER = { subject: "user_member", email: "chris@example.com" };
const OTHER = { subject: "user_other", email: "other@example.com" };

/**
 * The author gets beta access (paid access without touching the Stripe
 * component, which convex-test doesn't register). The member has no
 * subscription at all: members don't need one (spec #26).
 */
async function seed(t: TestConvex) {
	return await t.run(async (ctx) => {
		await ctx.db.insert("users", {
			clerkId: AUTHOR.subject,
			email: AUTHOR.email,
			name: "Michael Smith",
			role: "user",
			betaAccess: true,
		});
		await ctx.db.insert("users", {
			clerkId: MEMBER.subject,
			email: MEMBER.email,
			name: "Chris Johnson",
			role: "user",
		});
		await ctx.db.insert("users", {
			clerkId: OTHER.subject,
			email: OTHER.email,
			name: "Other Person",
			role: "user",
			betaAccess: true,
		});
		const journalId = await ctx.db.insert("journals", {
			userId: AUTHOR.subject,
			title: "Beloved Family",
			dateMs: Date.now(),
			type: "my_story",
		});
		await ctx.db.insert("journalEntries", {
			userId: AUTHOR.subject,
			journalId,
			title: "Author entry",
			dateMs: Date.now(),
			body: "Written by the author",
			mode: "writing",
		});
		return journalId;
	});
}

async function invite(
	t: TestConvex,
	journalId: Id<"journals">,
	email = MEMBER.email,
	token = "share_token",
) {
	return await t.mutation(internal.sharing.mutations.createInvite, {
		journalId,
		authorId: AUTHOR.subject,
		email,
		token,
	});
}

async function shareWithMember(t: TestConvex, journalId: Id<"journals">) {
	await invite(t, journalId);
	await t
		.withIdentity(MEMBER)
		.mutation(api.sharing.mutations.acceptInvite, { token: "share_token" });
}

async function addEntry(
	t: TestConvex,
	who: typeof AUTHOR,
	journalId: Id<"journals">,
	title: string,
	visibility?: "visible" | "hidden",
) {
	return await t
		.withIdentity(who)
		.mutation(api.journal.entries.mutations.create, {
			journalId,
			title,
			dateMs: Date.now(),
			body: `${title} body`,
			mode: "writing",
			visibility,
		});
}

beforeEach(() => {
	vi.useFakeTimers();
});
afterEach(() => {
	vi.useRealTimers();
});

describe("invites", () => {
	test("one slot per journal, no self-invites", async () => {
		const t = setup();
		const journalId = await seed(t);
		const first = await invite(t, journalId, "Chris@Example.com");
		expect(first.inviteEmail).toBe("chris@example.com");
		expect(first.hasAccount).toBe(true);
		await expect(invite(t, journalId, "x@example.com", "t2")).rejects.toThrow(
			/pending invite/,
		);
		await t
			.withIdentity(AUTHOR)
			.mutation(api.sharing.mutations.cancelInvite, { journalId });
		await expect(invite(t, journalId, AUTHOR.email, "t3")).rejects.toThrow(
			/yourself/,
		);
	});

	test("accepting requires the invited email", async () => {
		const t = setup();
		const journalId = await seed(t);
		await invite(t, journalId);
		await expect(
			t
				.withIdentity(OTHER)
				.mutation(api.sharing.mutations.acceptInvite, { token: "share_token" }),
		).rejects.toThrow(/different email/);
		const pending = await t
			.withIdentity(MEMBER)
			.query(api.sharing.queries.myPendingInvites, {});
		expect(pending).toEqual([
			{
				token: "share_token",
				journalTitle: "Beloved Family",
				authorName: "Michael Smith",
			},
		]);
	});

	test("expired invites can't be accepted", async () => {
		const t = setup();
		const journalId = await seed(t);
		await invite(t, journalId);
		await t.run(async (ctx) => {
			const share = await ctx.db.query("journalShares").first();
			if (share) await ctx.db.patch(share._id, { expiresAt: Date.now() - 1 });
		});
		await expect(
			t
				.withIdentity(MEMBER)
				.mutation(api.sharing.mutations.acceptInvite, { token: "share_token" }),
		).rejects.toThrow(/expired/);
	});
});

describe("shared journal", () => {
	test("moves to Our Story for both people", async () => {
		const t = setup();
		const journalId = await seed(t);
		await shareWithMember(t, journalId);

		const authorMine = await t
			.withIdentity(AUTHOR)
			.query(api.journal.queries.listByType, { type: "my_story" });
		expect(authorMine).toHaveLength(0);
		const authorOurs = await t
			.withIdentity(AUTHOR)
			.query(api.journal.queries.listByType, { type: "our_story" });
		expect(authorOurs.map((j) => j.viewerRole)).toEqual(["author"]);
		const memberOurs = await t
			.withIdentity(MEMBER)
			.query(api.journal.queries.listByType, { type: "our_story" });
		expect(memberOurs.map((j) => [j.title, j.viewerRole, j.isShared])).toEqual([
			["Beloved Family", "member", true],
		]);
	});

	test("members add entries without a subscription; hidden entries are locked", async () => {
		const t = setup();
		const journalId = await seed(t);
		await shareWithMember(t, journalId);

		const { entryId } = await addEntry(
			t,
			MEMBER,
			journalId,
			"Secret",
			"hidden",
		);
		await addEntry(t, MEMBER, journalId, "Open");

		const forAuthor = await t
			.withIdentity(AUTHOR)
			.query(api.journal.entries.queries.listByJournal, { journalId });
		const secret = forAuthor.find((entry) => entry._id === entryId);
		expect(secret?.locked).toBe(true);
		expect(secret?.body).toBeUndefined();
		expect(secret?.title).toBe("Secret");
		expect(secret?.createdByName).toBe("Chris Johnson");
		expect(
			await t
				.withIdentity(AUTHOR)
				.query(api.journal.entries.queries.getById, { id: entryId }),
		).toBeNull();

		const forMember = await t
			.withIdentity(MEMBER)
			.query(api.journal.entries.queries.listByJournal, { journalId });
		expect(forMember.find((entry) => entry._id === entryId)?.locked).toBe(
			false,
		);
		expect(forMember).toHaveLength(3);

		// Hidden entries never play on the public QR player.
		expect(
			await t.query(api.journal.entries.queries.getPublicMemory, {
				id: entryId,
				kind: "voice",
			}),
		).toBeNull();
	});

	test("people can't edit each other's entries or the journal", async () => {
		const t = setup();
		const journalId = await seed(t);
		await shareWithMember(t, journalId);
		const authorEntry = await t.run(async (ctx) =>
			ctx.db.query("journalEntries").first(),
		);
		await expect(
			t.withIdentity(MEMBER).mutation(api.journal.entries.mutations.remove, {
				id: authorEntry?._id as Id<"journalEntries">,
			}),
		).rejects.toThrow(/access to this entry/);
		await expect(
			t
				.withIdentity(MEMBER)
				.mutation(api.journal.mutations.remove, { id: journalId }),
		).rejects.toThrow();
	});

	test("strangers can't read it", async () => {
		const t = setup();
		const journalId = await seed(t);
		await shareWithMember(t, journalId);
		expect(
			await t
				.withIdentity(OTHER)
				.query(api.journal.queries.getById, { id: journalId }),
		).toBeNull();
		expect(
			await t
				.withIdentity(OTHER)
				.query(api.journal.entries.queries.listByJournal, { journalId }),
		).toEqual([]);
	});
});

describe("ending a share", () => {
	test("leaving deletes the member's entries and returns the journal", async () => {
		const t = setup();
		const journalId = await seed(t);
		await shareWithMember(t, journalId);
		await addEntry(t, MEMBER, journalId, "Member entry");

		await t
			.withIdentity(MEMBER)
			.mutation(api.sharing.mutations.leaveJournal, { journalId });

		const entries = await t.run((ctx) =>
			ctx.db
				.query("journalEntries")
				.withIndex("by_journalId", (q) => q.eq("journalId", journalId))
				.collect(),
		);
		expect(entries.map((entry) => entry.userId)).toEqual([AUTHOR.subject]);
		const authorMine = await t
			.withIdentity(AUTHOR)
			.query(api.journal.queries.listByType, { type: "my_story" });
		expect(authorMine).toHaveLength(1);
	});

	test("the author can remove the member", async () => {
		const t = setup();
		const journalId = await seed(t);
		await shareWithMember(t, journalId);
		await addEntry(t, MEMBER, journalId, "Member entry");
		await t
			.withIdentity(AUTHOR)
			.mutation(api.sharing.mutations.removeMember, { journalId });
		expect(
			await t
				.withIdentity(MEMBER)
				.query(api.journal.queries.getById, { id: journalId }),
		).toBeNull();
	});

	test("deleting the member's account removes their entries and the share", async () => {
		const t = setup();
		const journalId = await seed(t);
		await shareWithMember(t, journalId);
		await addEntry(t, MEMBER, journalId, "Member entry");
		await t.mutation(internal.user.mutations.deleteByClerkId, {
			clerkId: MEMBER.subject,
		});
		const [shares, entries] = await t.run(async (ctx) => [
			await ctx.db.query("journalShares").collect(),
			await ctx.db.query("journalEntries").collect(),
		]);
		expect(shares).toHaveLength(0);
		expect(entries.every((entry) => entry.userId === AUTHOR.subject)).toBe(
			true,
		);
	});
});
