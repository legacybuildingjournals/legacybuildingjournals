import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const deviceInfoValidator = v.object({
	userAgent: v.optional(v.string()),
	browserName: v.optional(v.string()),
	browserVersion: v.optional(v.string()),
	deviceType: v.optional(v.string()),
	isMobile: v.optional(v.boolean()),
	ipAddress: v.optional(v.string()),
	city: v.optional(v.string()),
	country: v.optional(v.string()),
	language: v.optional(v.string()),
	capturedAt: v.number(),
});

const userSubscriptionStatusValidator = v.union(
	v.literal("active"),
	v.literal("trialing"),
	v.literal("grace_period"),
	v.literal("canceled"),
	v.literal("none"),
);

const accountStatusValidator = v.union(
	v.literal("active"),
	v.literal("suspended"),
);

export const journalType = v.union(
	v.literal("my_story"),
	v.literal("their_story"),
);

export const planIntervalValidator = v.union(
	v.literal("monthly"),
	v.literal("annual"),
);

/** Where a paid subscription was purchased — determines where it can be managed. */
export const subscriptionProviderValidator = v.union(
	v.literal("apple"),
	v.literal("google"),
	v.literal("stripe"),
);

/** Lifecycle of an IAP subscription, mirrored from RevenueCat webhooks. */
export const iapSubscriptionStatusValidator = v.union(
	v.literal("active"),
	v.literal("trialing"),
	v.literal("grace_period"),
	// Will not renew, but access remains until currentPeriodEnd.
	v.literal("canceled"),
	v.literal("expired"),
);

export default defineSchema({
	products: defineTable({
		interval: planIntervalValidator,
		name: v.string(),
		stripePriceId: v.string(),
		stripeProductId: v.optional(v.string()),
		amountCents: v.number(),
		currency: v.string(),
		trialDays: v.number(),
		features: v.array(v.string()),
		tagline: v.optional(v.string()),
		highlight: v.optional(v.string()),
		sortOrder: v.number(),
		active: v.boolean(),
	})
		.index("by_interval", ["interval"])
		.index("by_stripe_price_id", ["stripePriceId"])
		.index("by_active_and_sort", ["active", "sortOrder"]),

	users: defineTable({
		clerkId: v.string(),
		email: v.string(),
		name: v.string(),
		role: v.union(v.literal("admin"), v.literal("user")),
		profilePictureId: v.optional(v.id("_storage")),
		deviceInfo: v.optional(deviceInfoValidator),
		agreedToTermsAt: v.optional(v.number()),
		welcomeCompletedAt: v.optional(v.number()),
		stripeCustomerId: v.optional(v.string()),
		subscriptionStatus: v.optional(userSubscriptionStatusValidator),
		/** Scheduled (deferred) plan switch, e.g. annual -> monthly at period end. */
		pendingPlanChange: v.optional(
			v.object({
				interval: planIntervalValidator,
				effectiveAt: v.number(),
			}),
		),
		accountStatus: v.optional(accountStatusValidator),
		/** Admin-granted free access; bypasses subscription paywall. */
		betaAccess: v.optional(v.boolean()),
		/** Convex scheduled-function id for the day-5 trial reminder email. Cleared on send or conversion. */
		trialReminderJobId: v.optional(v.id("_scheduled_functions")),
	})
		.index("by_clerk_id", ["clerkId"])
		.index("by_email", ["email"])
		.index("by_stripe_customer_id", ["stripeCustomerId"]),

	journals: defineTable({
		userId: v.string(),
		title: v.string(),
		dateMs: v.number(),
		type: journalType,
		dedication: v.optional(v.string()),
		coverImageUrl: v.optional(v.string()),
		coverImageId: v.optional(v.id("_storage")),
		updatedAtMs: v.optional(v.number()),
		/** Manual library order within a story tab (lower = earlier). */
		sortOrder: v.optional(v.number()),
		/** Optional end date for the journal period (e.g. "Apr 16 – Jul 2, 2026"). */
		endDateMs: v.optional(v.number()),
		/** Optional inline entry log captured at journal creation. */
		entryLog: v.optional(v.string()),
	})
		.index("by_userId", ["userId"])
		.index("by_userId_and_type", ["userId", "type"]),

	/**
	 * Server-side record of native IAP subscriptions (Apple / Google), synced from
	 * RevenueCat webhooks. Stripe subscriptions stay in the Stripe component; a
	 * unified query merges both. `userId` is the Clerk id (set via Purchases.logIn).
	 */
	subscriptions: defineTable({
		userId: v.string(),
		provider: subscriptionProviderValidator,
		status: iapSubscriptionStatusValidator,
		interval: v.optional(planIntervalValidator),
		storeProductId: v.string(),
		/** Unix ms when the current period ends (access cutoff). */
		currentPeriodEnd: v.optional(v.number()),
		willRenew: v.optional(v.boolean()),
		isTrial: v.optional(v.boolean()),
		/** RevenueCat app user id (== userId once identified). */
		rcAppUserId: v.optional(v.string()),
		environment: v.optional(
			v.union(v.literal("sandbox"), v.literal("production")),
		),
		updatedAt: v.number(),
	})
		.index("by_userId", ["userId"])
		.index("by_rcAppUserId", ["rcAppUserId"]),

	journalEntries: defineTable({
		userId: v.string(),
		journalId: v.id("journals"),
		title: v.string(),
		dateMs: v.number(),
		body: v.optional(v.string()),
		mode: v.union(v.literal("writing"), v.literal("recording")),
		imageUrl: v.optional(v.string()),
		audioUrl: v.optional(v.string()),
		imageId: v.optional(v.id("_storage")),
		audioId: v.optional(v.id("_storage")),
		/** Recorded clip length in ms, captured at record time so playback UIs can
		 * show the duration without waiting on the player to load remote audio. */
		audioDurationMs: v.optional(v.number()),
	})
		.index("by_journalId", ["journalId"])
		.index("by_userId", ["userId"]),
});
