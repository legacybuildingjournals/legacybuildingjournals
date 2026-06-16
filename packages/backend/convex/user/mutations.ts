import { ConvexError, v } from "convex/values";

import type { Id } from "../_generated/dataModel";
import {
	internalMutation,
	type MutationCtx,
	mutation,
} from "../_generated/server";
import {
	deleteEntryStorageFiles,
	deleteJournalCoverStorage,
} from "../journal/storage";

async function deleteProfilePictureIfExists(
	ctx: MutationCtx,
	profilePictureId: Id<"_storage"> | undefined,
) {
	if (profilePictureId) {
		await ctx.storage.delete(profilePictureId);
	}
}

export const createOrUpdateFromClerk = internalMutation({
	args: {
		clerkId: v.string(),
		email: v.string(),
		name: v.string(),
		profilePictureId: v.optional(v.id("_storage")),
		initialRole: v.optional(v.union(v.literal("admin"), v.literal("user"))),
	},
	handler: async (ctx, args) => {
		const existing = await ctx.db
			.query("users")
			.withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
			.unique();

		if (existing) {
			await ctx.db.patch(existing._id, {
				email: args.email.trim().toLowerCase(),
				...(args.profilePictureId !== undefined
					? { profilePictureId: args.profilePictureId }
					: {}),
			});
			return existing._id;
		}

		return await ctx.db.insert("users", {
			clerkId: args.clerkId,
			email: args.email.trim().toLowerCase(),
			name: args.name,
			role: args.initialRole ?? "user",
			...(args.profilePictureId !== undefined
				? { profilePictureId: args.profilePictureId }
				: {}),
		});
	},
});

/** Creates the Convex user row if the Clerk webhook has not run yet (e.g. right after signup). */
export const ensureCurrentUser = mutation({
	args: {
		/** Clerk username at sign-up; maps to Convex `users.name`. */
		preferredName: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new ConvexError({
				code: "UNAUTHENTICATED",
				message: "You must be signed in.",
			});
		}

		const existing = await ctx.db
			.query("users")
			.withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
			.unique();

		if (existing) {
			return existing._id;
		}

		const email = identity.email?.trim().toLowerCase();
		if (!email) {
			throw new ConvexError({
				code: "MISSING_EMAIL",
				message: "Your account is missing an email address.",
			});
		}

		const preferred = args.preferredName?.trim();
		const nameFromIdentity = identity.name?.trim();
		const name =
			(preferred && preferred.length >= 2 ? preferred : undefined) ??
			(nameFromIdentity && nameFromIdentity.length >= 2
				? nameFromIdentity
				: undefined) ??
			email.split("@")[0] ??
			"User";

		return await ctx.db.insert("users", {
			clerkId: identity.subject,
			email,
			name,
			role: "user",
		});
	},
});

export const agreeToTerms = mutation({
	args: {},
	handler: async (ctx) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new ConvexError({
				code: "UNAUTHENTICATED",
				message: "You must be signed in.",
			});
		}
		const user = await ctx.db
			.query("users")
			.withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
			.unique();
		if (!user) {
			throw new ConvexError({
				code: "USER_NOT_REGISTERED",
				message: "No Convex user found for this account yet.",
			});
		}
		if (user.agreedToTermsAt) return;
		await ctx.db.patch(user._id, { agreedToTermsAt: Date.now() });
	},
});

export const completeWelcome = mutation({
	args: {},
	handler: async (ctx) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new ConvexError({
				code: "UNAUTHENTICATED",
				message: "You must be signed in.",
			});
		}
		const user = await ctx.db
			.query("users")
			.withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
			.unique();
		if (!user) {
			throw new ConvexError({
				code: "USER_NOT_REGISTERED",
				message: "No Convex user found for this account yet.",
			});
		}
		if (user.welcomeCompletedAt) return;
		await ctx.db.patch(user._id, { welcomeCompletedAt: Date.now() });
	},
});

export const updateProfile = mutation({
	args: {
		name: v.string(),
	},
	handler: async (ctx, { name }) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new ConvexError({
				code: "UNAUTHENTICATED",
				message: "You must be signed in to update your profile.",
			});
		}

		const trimmed = name.trim();
		if (trimmed.length < 2) {
			throw new ConvexError({
				code: "INVALID_NAME",
				message: "Username must be at least 2 characters.",
			});
		}
		if (trimmed.length > 80) {
			throw new ConvexError({
				code: "INVALID_NAME",
				message: "Username must be 80 characters or less.",
			});
		}

		const user = await ctx.db
			.query("users")
			.withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
			.unique();

		if (!user) {
			throw new ConvexError({
				code: "USER_NOT_REGISTERED",
				message: "No Convex user found for this account yet.",
			});
		}

		await ctx.db.patch(user._id, { name: trimmed });
	},
});

export const generateProfilePictureUploadUrl = mutation({
	args: {},
	handler: async (ctx) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new ConvexError({
				code: "UNAUTHENTICATED",
				message: "You must be signed in to upload a profile picture.",
			});
		}
		return await ctx.storage.generateUploadUrl();
	},
});

export const setProfilePicture = mutation({
	args: {
		storageId: v.id("_storage"),
	},
	handler: async (ctx, { storageId }) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new ConvexError({
				code: "UNAUTHENTICATED",
				message: "You must be signed in to update your profile picture.",
			});
		}
		const user = await ctx.db
			.query("users")
			.withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
			.unique();
		if (!user) {
			throw new ConvexError({
				code: "USER_NOT_REGISTERED",
				message: "No Convex user found for this account yet.",
			});
		}
		await deleteProfilePictureIfExists(ctx, user.profilePictureId);
		await ctx.db.patch(user._id, { profilePictureId: storageId });
	},
});

export const removeProfilePicture = mutation({
	args: {},
	handler: async (ctx) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new ConvexError({
				code: "UNAUTHENTICATED",
				message: "You must be signed in.",
			});
		}
		const user = await ctx.db
			.query("users")
			.withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
			.unique();
		if (!user) {
			throw new ConvexError({
				code: "USER_NOT_REGISTERED",
				message: "No Convex user found for this account yet.",
			});
		}
		await deleteProfilePictureIfExists(ctx, user.profilePictureId);
		await ctx.db.patch(user._id, { profilePictureId: undefined });
	},
});

export const setDeviceInfo = mutation({
	args: {
		userAgent: v.optional(v.string()),
		browserName: v.optional(v.string()),
		browserVersion: v.optional(v.string()),
		deviceType: v.optional(v.string()),
		isMobile: v.optional(v.boolean()),
		ipAddress: v.optional(v.string()),
		city: v.optional(v.string()),
		country: v.optional(v.string()),
		language: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new ConvexError({
				code: "UNAUTHENTICATED",
				message: "You must be signed in to record device info.",
			});
		}

		const user = await ctx.db
			.query("users")
			.withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
			.unique();

		if (!user) {
			throw new ConvexError({
				code: "USER_NOT_REGISTERED",
				message: "No Convex user found for this account yet.",
			});
		}

		await ctx.db.patch(user._id, {
			deviceInfo: {
				...args,
				capturedAt: Date.now(),
			},
		});
	},
});

async function deleteAllDataForClerkUser(
	ctx: MutationCtx,
	clerkId: string,
): Promise<void> {
	const journals = await ctx.db
		.query("journals")
		.withIndex("by_userId", (q) => q.eq("userId", clerkId))
		.collect();

	for (const journal of journals) {
		const entries = await ctx.db
			.query("journalEntries")
			.withIndex("by_journalId", (q) => q.eq("journalId", journal._id))
			.collect();

		for (const entry of entries) {
			await deleteEntryStorageFiles(ctx, entry);
			await ctx.db.delete(entry._id);
		}

		await deleteJournalCoverStorage(ctx, journal);
		await ctx.db.delete(journal._id);
	}

	const orphanEntries = await ctx.db
		.query("journalEntries")
		.withIndex("by_userId", (q) => q.eq("userId", clerkId))
		.collect();

	for (const entry of orphanEntries) {
		await deleteEntryStorageFiles(ctx, entry);
		await ctx.db.delete(entry._id);
	}

	// Remove any synced native (Apple/Google) subscription records.
	const subscriptions = await ctx.db
		.query("subscriptions")
		.withIndex("by_userId", (q) => q.eq("userId", clerkId))
		.collect();
	for (const subscription of subscriptions) {
		await ctx.db.delete(subscription._id);
	}

	const user = await ctx.db
		.query("users")
		.withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
		.unique();

	if (user) {
		await deleteProfilePictureIfExists(ctx, user.profilePictureId);
		await ctx.db.delete(user._id);
	}
}

export const deleteByClerkId = internalMutation({
	args: {
		clerkId: v.string(),
	},
	handler: async (ctx, { clerkId }) => {
		await deleteAllDataForClerkUser(ctx, clerkId);
	},
});

/**
 * Internal: patch a user's email immediately after a Clerk email change so the
 * Convex row reflects the new email without waiting for the Clerk webhook.
 */
export const setEmailByClerkId = internalMutation({
	args: {
		clerkId: v.string(),
		email: v.string(),
	},
	handler: async (ctx, { clerkId, email }) => {
		const normalized = email.trim().toLowerCase();
		if (!normalized) return;
		const user = await ctx.db
			.query("users")
			.withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
			.unique();
		if (!user) return;
		if (user.email !== normalized) {
			await ctx.db.patch(user._id, { email: normalized });
		}
	},
});
