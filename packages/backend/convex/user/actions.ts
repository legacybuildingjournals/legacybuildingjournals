import { createClerkClient } from "@clerk/backend";
import { ConvexError, v } from "convex/values";

import { internal } from "../_generated/api";
import { action } from "../_generated/server";

const EMAIL_IN_USE_MESSAGE =
	"That email is already linked to another account. Choose a different email.";

function normalizeEmail(email: string) {
	return email.trim().toLowerCase();
}

/**
 * Ensures a new email is not owned by another Clerk or Convex user before the
 * client starts Clerk's createEmailAddress + verification flow.
 */
export const assertEmailAvailableForChange = action({
	args: { email: v.string() },
	returns: v.null(),
	handler: async (ctx, { email }) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new ConvexError({
				code: "UNAUTHENTICATED",
				message: "You must be signed in to update your email.",
			});
		}

		const normalized = normalizeEmail(email);
		if (!normalized.includes("@")) {
			throw new ConvexError({
				code: "INVALID_ARGUMENT",
				message: "A valid email address is required.",
			});
		}

		const existingInConvex = await ctx.runQuery(
			internal.user.queries.getByEmailInternal,
			{ email: normalized },
		);
		if (existingInConvex && existingInConvex.clerkId !== identity.subject) {
			throw new ConvexError({
				code: "EMAIL_IN_USE",
				message: EMAIL_IN_USE_MESSAGE,
			});
		}

		const secretKey = process.env.CLERK_SECRET_KEY;
		if (!secretKey) {
			throw new ConvexError("CLERK_SECRET_KEY is not configured in Convex.");
		}

		const clerk = createClerkClient({ secretKey });
		const currentUser = await clerk.users.getUser(identity.subject);

		for (const address of currentUser.emailAddresses) {
			if (normalizeEmail(address.emailAddress) === normalized) {
				return null;
			}
		}

		for (const account of currentUser.externalAccounts ?? []) {
			const externalEmail = account.emailAddress?.trim();
			if (externalEmail && normalizeEmail(externalEmail) === normalized) {
				return null;
			}
		}

		const { data: clerkUsers } = await clerk.users.getUserList({
			emailAddress: [normalized],
		});

		for (const clerkUser of clerkUsers) {
			if (clerkUser.id !== identity.subject) {
				throw new ConvexError({
					code: "EMAIL_IN_USE",
					message: EMAIL_IN_USE_MESSAGE,
				});
			}
		}

		return null;
	},
});
