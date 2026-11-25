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
/**
 * Lifecycle of a gifted lifetime membership. Expiry is not a stored status: an
 * unredeemed `paid` gift past `expiresAt` is expired, computed on read, so no
 * cron is needed to flip rows.
 */
const giftStatusValidator = v.union(
	/** Form saved, checkout not completed yet. Never shown to the recipient. */
	v.literal("pending_payment"),
	/** Payment confirmed by the provider webhook; redeemable. */
	v.literal("paid"),
	v.literal("redeemed"),
	/** Refunded or charged back. Unredeemed: void. Redeemed: lifetime revoked. */
	v.literal("refunded"),
);
const giftProviderValidator = v.union(
	v.literal("stripe"),
	v.literal("app_store"),
	v.literal("play_store"),
);
const accountStatusValidator = v.union(
	v.literal("active"),
	v.literal("suspended"),
);

/**
 * Per-user push notification settings. Daily prompts + the first-entry
 * celebration are scheduled locally on-device; the `inactivity` and
 * `exportReminders` toggles gate the server-driven (Expo Push) reminders sent
 * by the daily cron sweep. `dailyPromptHour`/`Minute` are the user's chosen
 * local time for daily prompts, mirrored here so preferences survive reinstalls
 * and stay in sync across a user's devices.
 */
const notificationPreferencesValidator = v.object({
	dailyPrompts: v.boolean(),
	inactivity: v.boolean(),
	exportReminders: v.boolean(),
	/** Local hour (0-23) the user wants the daily journaling prompt. */
	dailyPromptHour: v.number(),
	/** Local minute (0-59) the user wants the daily journaling prompt. */
	dailyPromptMinute: v.number(),
	updatedAt: v.number(),
});

export const journalType = v.union(
	v.literal("my_story"),
	v.literal("their_story"),
);

/**
 * Library tabs. "our_story" is not a stored journal type: it lists journals
 * that are actively shared (as author or member), whatever their own type.
 */
export const libraryTab = v.union(
	v.literal("my_story"),
	v.literal("their_story"),
	v.literal("our_story"),
);

/**
 * Who can see an entry inside a shared journal. Absent = "visible". A
 * "hidden" entry shows only its title with a lock to everyone but its creator.
 */
export const entryVisibility = v.union(
	v.literal("visible"),
	v.literal("hidden"),
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
		/**
		 * Lifetime membership, granted by redeeming a gift. Bound to this account
		 * (not the email), so it survives email changes. Cleared if the gift is
		 * refunded or charged back.
		 */
		lifetimeAccess: v.optional(
			v.object({ giftId: v.id("gifts"), grantedAt: v.number() }),
		),
		/** Convex scheduled-function id for the day-5 trial reminder email. Cleared on send or conversion. */
		trialReminderJobId: v.optional(v.id("_scheduled_functions")),
		/**
		 * Day-5 trial reminder email state. Optional so pre-existing users and
		 * non-trial (e.g. annual) signups are untouched. Set to `false` when a
		 * 7-day trial starts and the job is scheduled, flipped to `true` once the
		 * email is actually sent.
		 */
		trialReminderEmailSent: v.optional(v.boolean()),
		/** Push notification settings. Absent until the user opts in on-device. */
		notificationPreferences: v.optional(notificationPreferencesValidator),
		/** Unix ms of the user's most recent journal entry — drives inactivity reminders. */
		lastEntryAt: v.optional(v.number()),
		/** Total number of journal entries created (used to detect the first entry). */
		entryCount: v.optional(v.number()),
		/** Unix ms the last inactivity push was sent — throttles the daily sweep. */
		lastInactivityPushAt: v.optional(v.number()),
		/** Unix ms the last export reminder push was sent — throttles the export sweep. */
		lastExportReminderAt: v.optional(v.number()),
		/**
		 * This user's own shareable invite code. Generated lazily the first time
		 * they open Community, then never changes — it identifies the person, not
		 * a device, so it is the same on web and native.
		 */
		inviteCode: v.optional(v.string()),
		/**
		 * Clerk id of whoever invited this user. Written once during onboarding and
		 * never changed, so "invited" always means "arrived through an invite".
		 */
		invitedBy: v.optional(v.string()),
		invitedAt: v.optional(v.number()),
		/** Where the claim came from — kept because it can't be reconstructed later. */
		invitedVia: v.optional(
			v.union(
				v.literal("web"),
				v.literal("ios"),
				v.literal("android"),
				v.literal("manual"),
			),
		),
	})
		.index("by_clerk_id", ["clerkId"])
		.index("by_email", ["email"])
		.index("by_stripe_customer_id", ["stripeCustomerId"])
		.index("by_subscription_status", ["subscriptionStatus"])
		.index("by_invite_code", ["inviteCode"])
		.index("by_invited_by", ["invitedBy"]),

	/**
	 * Expo push tokens, one row per device. A user can have several (phone +
	 * tablet), so this is a separate table keyed by Clerk id. Tokens are unique
	 * per install; we upsert on `token` to avoid duplicates when a device
	 * re-registers.
	 */
	pushTokens: defineTable({
		userId: v.string(),
		token: v.string(),
		platform: v.union(v.literal("ios"), v.literal("android"), v.literal("web")),
		deviceName: v.optional(v.string()),
		updatedAt: v.number(),
	})
		.index("by_userId", ["userId"])
		.index("by_token", ["token"]),

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
		/** User-chosen background colour for the journal, as a hex string. */
		backgroundColor: v.optional(v.string()),
		/** User-chosen background image; takes precedence over the colour. */
		backgroundImageId: v.optional(v.id("_storage")),
		backgroundImageUrl: v.optional(v.string()),
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
		mode: v.union(
			v.literal("writing"),
			v.literal("recording"),
			v.literal("video"),
		),
		imageUrl: v.optional(v.string()),
		audioUrl: v.optional(v.string()),
		imageId: v.optional(v.id("_storage")),
		audioId: v.optional(v.id("_storage")),
		/** Recorded clip length in ms, captured at record time so playback UIs can
		 * show the duration without waiting on the player to load remote audio. */
		audioDurationMs: v.optional(v.number()),
		/**
		 * Video entries. The poster frame is stored in `imageId` like any other
		 * entry cover, so lists, the PDF and the detail view all treat it as the
		 * entry's image without special-casing.
		 */
		videoId: v.optional(v.id("_storage")),
		videoUrl: v.optional(v.string()),
		videoDurationMs: v.optional(v.number()),
		/** Journal sharing: absent = visible to the other person. */
		visibility: v.optional(entryVisibility),
	})
		.index("by_journalId", ["journalId"])
		.index("by_userId", ["userId"]),

	/**
	 * Answers to the onboarding questionnaire, written by either entry point —
	 * in-app after sign-up, or the external form filled in before the person has
	 * an account. Kept in its own table rather than on `users` precisely because
	 * an external response exists before any user row does.
	 *
	 * A row is "linked" once `clerkId` is set. Until then it is claimable: by
	 * `token` (carried through the web continuation link, and authoritative even
	 * when the emails differ) or by `email` (the only thing that survives the
	 * App Store round trip). Unclaimed rows are harmless if never matched.
	 */
	onboardingResponses: defineTable({
		/** High-entropy claim token handed back to the external form. */
		token: v.string(),
		/** Lowercased. Absent only in the unlikely event an in-app user has none. */
		email: v.optional(v.string()),
		/** Clerk id of the owner once claimed; absent while unlinked. */
		clerkId: v.optional(v.string()),
		source: v.union(
			v.literal("external"),
			v.literal("web"),
			v.literal("ios"),
			v.literal("android"),
		),
		/** Q1's answer — selects which wording variant the user saw. */
		recipient: v.string(),
		answers: v.array(
			v.object({ questionId: v.string(), optionId: v.string() }),
		),
		completedAt: v.number(),
		linkedAt: v.optional(v.number()),
	})
		.index("by_token", ["token"])
		.index("by_email", ["email"])
		.index("by_clerk_id", ["clerkId"]),

	/**
	 * Gifted lifetime memberships. A row is created as `pending_payment` when the
	 * purchaser saves the gift form (so the details survive a failed payment) and
	 * becomes redeemable only when a provider webhook confirms payment. All
	 * user ids are Clerk ids.
	 */
	gifts: defineTable({
		purchaserId: v.string(),
		purchaserName: v.string(),
		purchaserEmail: v.string(),
		recipientName: v.string(),
		/** Lower-cased. Redemption requires a signed-in account with this email. */
		recipientEmail: v.string(),
		/** "Heartfelt Title": used as the email subject and on the gift card. */
		title: v.string(),
		message: v.string(),
		status: giftStatusValidator,
		provider: v.optional(giftProviderValidator),
		/**
		 * Provider payment id (Stripe PaymentIntent id, or store transaction id).
		 * Unique per gift; the idempotency key against repeated webhooks.
		 */
		providerRef: v.optional(v.string()),
		/** Charged amount in minor units, in the currency actually charged. */
		amountMinor: v.optional(v.number()),
		currency: v.optional(v.string()),
		/** Unguessable token in the QR code / Claim My Gift link. Set when paid. */
		redeemToken: v.optional(v.string()),
		paidAt: v.optional(v.number()),
		/** paidAt + 12 months. */
		expiresAt: v.optional(v.number()),
		cardImageId: v.optional(v.id("_storage")),
		/**
		 * Set when the purchaser starts an in-app (store) purchase for this
		 * draft, so the RevenueCat webhook can match the store transaction to
		 * the gift if the app's own confirmation never arrives.
		 */
		storeCheckoutStartedAt: v.optional(v.number()),
		/** Guards the purchaser email against duplicate sends. */
		purchaserEmailSentAt: v.optional(v.number()),
		/** Last manual resend from the gift history (throttles the button). */
		purchaserEmailResentAt: v.optional(v.number()),
		redeemedBy: v.optional(v.string()),
		redeemedAt: v.optional(v.number()),
		refundedAt: v.optional(v.number()),
		createdAt: v.number(),
		updatedAt: v.number(),
	})
		.index("by_purchaser", ["purchaserId"])
		.index("by_recipient_email", ["recipientEmail"])
		.index("by_redeem_token", ["redeemToken"])
		.index("by_provider_ref", ["providerRef"])
		.index("by_status", ["status"]),

	/**
	 * Journal sharing ("Our Story"). One row per journal at most: a pending
	 * invite or the active member. Cancelling, leaving or removing deletes the
	 * row. All user ids are Clerk ids; once accepted, the share is bound to
	 * the member's account, not the invited email.
	 */
	journalShares: defineTable({
		journalId: v.id("journals"),
		authorId: v.string(),
		/** Lower-cased email the invite was sent to. */
		inviteEmail: v.string(),
		/** Unguessable token in the invite link. */
		token: v.string(),
		status: v.union(v.literal("pending"), v.literal("active")),
		memberId: v.optional(v.string()),
		createdAt: v.number(),
		/** Pending invites expire 30 days after creation. */
		expiresAt: v.number(),
		acceptedAt: v.optional(v.number()),
		/** Set when the invite email was sent (only for emails with no account). */
		emailSentAt: v.optional(v.number()),
	})
		.index("by_journal", ["journalId"])
		.index("by_member", ["memberId"])
		.index("by_author", ["authorId"])
		.index("by_invite_email", ["inviteEmail"])
		.index("by_token", ["token"]),
});
