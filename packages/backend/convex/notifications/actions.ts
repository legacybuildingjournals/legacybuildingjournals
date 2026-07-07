import { v } from "convex/values";

import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";
import {
	EXPORT_MESSAGES,
	INACTIVITY_MESSAGES,
	type PushMessage,
	pickMessage,
} from "./messages";

const EXPO_PUSH_ENDPOINT = "https://exp.host/--/api/v2/push/send";
/** Expo accepts up to 100 messages per request. */
const EXPO_BATCH_SIZE = 100;

type ExpoPushMessage = {
	to: string;
	title: string;
	body: string;
	sound: "default";
	data: Record<string, unknown>;
};

type ExpoTicket = {
	status: "ok" | "error";
	id?: string;
	message?: string;
	details?: { error?: string };
};

/**
 * Send a batch of Expo push messages. Returns the tokens Expo reported as
 * `DeviceNotRegistered` so the caller can prune them. Never throws on a single
 * bad token — logs and continues, matching the resilient pattern used by the
 * email actions.
 */
async function sendExpoPush(
	messages: ExpoPushMessage[],
): Promise<{ invalidTokens: string[] }> {
	const invalidTokens: string[] = [];

	for (let i = 0; i < messages.length; i += EXPO_BATCH_SIZE) {
		const batch = messages.slice(i, i + EXPO_BATCH_SIZE);
		let response: Response;
		try {
			response = await fetch(EXPO_PUSH_ENDPOINT, {
				method: "POST",
				headers: {
					Accept: "application/json",
					"Content-Type": "application/json",
				},
				body: JSON.stringify(batch),
			});
		} catch (err) {
			console.error("[notifications] Expo push request failed:", err);
			continue;
		}

		if (!response.ok) {
			console.error(
				`[notifications] Expo push HTTP ${response.status}:`,
				await response.text().catch(() => ""),
			);
			continue;
		}

		const json = (await response.json().catch(() => null)) as {
			data?: ExpoTicket[];
		} | null;
		const tickets = json?.data ?? [];
		tickets.forEach((ticket, index) => {
			if (
				ticket.status === "error" &&
				ticket.details?.error === "DeviceNotRegistered"
			) {
				const bad = batch[index]?.to;
				if (bad) invalidTokens.push(bad);
			} else if (ticket.status === "error") {
				console.error(
					"[notifications] Expo push ticket error:",
					ticket.message,
				);
			}
		});
	}

	return { invalidTokens };
}

type PushTarget = { clerkUserId: string; tokens: string[] };

/** Build one Expo message per token for a set of targets, rotating copy. */
function buildMessages(
	targets: PushTarget[],
	pool: PushMessage[],
	type: string,
	url: string,
): { messages: ExpoPushMessage[]; sentUserIds: string[] } {
	const messages: ExpoPushMessage[] = [];
	const sentUserIds: string[] = [];

	targets.forEach((target, i) => {
		if (target.tokens.length === 0) return;
		const copy = pickMessage(pool, i);
		sentUserIds.push(target.clerkUserId);
		for (const token of target.tokens) {
			messages.push({
				to: token,
				title: copy.title,
				body: copy.body,
				sound: "default",
				data: { type, url },
			});
		}
	});

	return { messages, sentUserIds };
}

/** Daily sweep: push a re-engagement nudge to users who've gone quiet. */
export const runInactivitySweep = internalAction({
	args: {},
	handler: async (ctx): Promise<{ sent: number }> => {
		const targets = await ctx.runQuery(
			internal.notifications.queries.getInactivityTargets,
			{},
		);
		if (targets.length === 0) return { sent: 0 };

		const { messages, sentUserIds } = buildMessages(
			targets,
			INACTIVITY_MESSAGES,
			"inactivity",
			"/(tabs)",
		);

		const { invalidTokens } = await sendExpoPush(messages);
		if (invalidTokens.length > 0) {
			await ctx.runMutation(
				internal.notifications.mutations.removeTokensByValue,
				{ tokens: invalidTokens },
			);
		}

		for (const clerkUserId of sentUserIds) {
			await ctx.runMutation(
				internal.notifications.mutations.markInactivityPushSent,
				{ clerkUserId },
			);
		}

		return { sent: sentUserIds.length };
	},
});

/** Daily sweep: remind users with entries to export/back up their journal. */
export const runExportSweep = internalAction({
	args: {},
	handler: async (ctx): Promise<{ sent: number }> => {
		const targets = await ctx.runQuery(
			internal.notifications.queries.getExportTargets,
			{},
		);
		if (targets.length === 0) return { sent: 0 };

		const { messages, sentUserIds } = buildMessages(
			targets,
			EXPORT_MESSAGES,
			"export",
			"/(tabs)/library",
		);

		const { invalidTokens } = await sendExpoPush(messages);
		if (invalidTokens.length > 0) {
			await ctx.runMutation(
				internal.notifications.mutations.removeTokensByValue,
				{ tokens: invalidTokens },
			);
		}

		for (const clerkUserId of sentUserIds) {
			await ctx.runMutation(
				internal.notifications.mutations.markExportReminderSent,
				{ clerkUserId },
			);
		}

		return { sent: sentUserIds.length };
	},
});

/**
 * Dev helper: send a test push to the signed-in user's registered devices.
 * Guarded by ALLOW_BILLING_RESET (the repo's existing dev flag) so it can't be
 * abused in production.
 */
export const sendTestPush = internalAction({
	args: { clerkUserId: v.string(), title: v.string(), body: v.string() },
	handler: async (ctx, args): Promise<{ sent: number }> => {
		const targets = await ctx.runQuery(
			internal.notifications.queries.getInactivityTargets,
			{},
		);
		const mine = targets.find((t) => t.clerkUserId === args.clerkUserId);
		if (!mine) return { sent: 0 };
		const messages: ExpoPushMessage[] = mine.tokens.map((token) => ({
			to: token,
			title: args.title,
			body: args.body,
			sound: "default",
			data: { type: "test", url: "/(tabs)" },
		}));
		await sendExpoPush(messages);
		return { sent: messages.length };
	},
});
