"use node";

import { ConvexError, v } from "convex/values";
import { Resend } from "resend";
import { internal } from "../_generated/api";
import { action, internalAction } from "../_generated/server";

export const sendTrialDayFiveReminder = internalAction({
	args: {
		clerkUserId: v.string(),
		source: v.union(v.literal("stripe"), v.literal("revenuecat")),
	},
	handler: async (ctx, { clerkUserId, source }) => {
		const context = await ctx.runQuery(
			internal.email.queries.getTrialReminderContext,
			{ clerkUserId, source },
		);
		if (!context) return;

		// Safety net against duplicate sends.
		if (context.alreadySent) {
			await ctx.runMutation(internal.email.mutations.cancelTrialReminder, {
				clerkUserId,
			});
			return;
		}

		// Guard: user may have converted or churned before day 5.
		if (!context.isTrialing) {
			await ctx.runMutation(internal.email.mutations.cancelTrialReminder, {
				clerkUserId,
			});
			return;
		}

		const apiKey = process.env.RESEND_API_KEY;
		if (!apiKey) {
			console.error("Missing RESEND_API_KEY in Convex environment variables.");
			return;
		}

		const firstName = context.name.split(" ")[0] ?? context.name;
		const appUrl =
			process.env.APP_URL ?? "https://app.legacybuildingjournals.com";
		const journalUrl = appUrl + "/dashboard";
		const manage = resolveManageDestination(
			context.provider,
			appUrl + "/dashboard/billing",
		);

		const resend = new Resend(apiKey);
		const { error } = await resend.emails.send({
			from: "Legacy Building Journals <hello@legacybuildingjournals.com>",
			to: [context.email],
			subject: `${firstName}, your trial ends in 2 days`,
			html: buildTrialReminderHtml({
				firstName,
				journalUrl,
				manageUrl: manage.url,
				manageLabel: manage.label,
			}),
		});

		if (error) {
			// Leave the job record intact so it isn't marked as sent on failure.
			console.error("Resend error sending trial reminder:", error);
			return;
		}

		// Mark as sent: clears the job id and flips trialReminderEmailSent.
		await ctx.runMutation(internal.email.mutations.markTrialReminderSent, {
			clerkUserId,
		});
	},
});

/** Apple/Google forbid managing IAP subscriptions outside their stores. */
const STORE_SUBSCRIPTION_URLS = {
	apple: "https://apps.apple.com/account/subscriptions",
	google: "https://play.google.com/store/account/subscriptions",
} as const;

/** Pick the correct "manage subscription" link + label for the user's store. */
function resolveManageDestination(
	provider: "stripe" | "apple" | "google",
	webBillingUrl: string,
): { url: string; label: string } {
	switch (provider) {
		case "apple":
			return {
				url: STORE_SUBSCRIPTION_URLS.apple,
				label: "Manage in App Store",
			};
		case "google":
			return {
				url: STORE_SUBSCRIPTION_URLS.google,
				label: "Manage in Google Play",
			};
		default:
			return { url: webBillingUrl, label: "Manage Subscription" };
	}
}

function buildTrialReminderHtml({
	firstName,
	journalUrl,
	manageUrl,
	manageLabel,
}: {
	firstName: string;
	journalUrl: string;
	manageUrl: string;
	manageLabel: string;
}): string {
	return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your trial ends in 2 days</title>
</head>
<body style="margin:0;padding:0;background:#ebf6f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#ebf6f6;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #c7c7c7;">
          <!-- Header -->
          <tr>
            <td style="background:#008080;padding:24px 40px;">
              <p style="margin:0;color:#ffffff;font-size:17px;font-weight:700;letter-spacing:0.01em;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">Legacy Building Journals</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 20px;font-size:16px;color:#1a1a1a;line-height:1.7;">Hi ${firstName},</p>
              <p style="margin:0 0 16px;font-size:16px;color:#1a1a1a;line-height:1.7;">
                We don't forget all at once. We forget in pieces — until one day we can't quite remember what a year even felt like, or the exact sound of someone's voice.
              </p>
              <p style="margin:0 0 16px;font-size:16px;color:#1a1a1a;line-height:1.7;">
                The only real defense is a habit. Small, repeated, adding up to something whole — something the people who love you will be grateful you kept. You've already started.
              </p>
              <p style="margin:0 0 24px;font-size:16px;color:#1a1a1a;line-height:1.7;">
                In 2 days, your trial ends and that habit continues for <strong style="color:#008080;">$3.99/month</strong> — about 13 cents a day, less than a coffee.
              </p>
              <p style="margin:0 0 32px;font-size:16px;color:#8a8a8a;line-height:1.7;">
                No action needed to keep going. Want to cancel instead? You can, anytime before then.
              </p>
              <!-- Buttons -->
              <table cellpadding="0" cellspacing="0" style="margin-bottom:36px;">
                <tr>
                  <td style="padding-right:12px;">
                    <a href="${journalUrl}"
                       style="display:inline-block;background:#008080;color:#ffffff;font-size:15px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;text-decoration:none;padding:13px 28px;border-radius:8px;font-weight:600;">
                      Continue My Journal
                    </a>
                  </td>
                  <td>
                    <a href="${manageUrl}"
                       style="display:inline-block;background:#ffffff;color:#008080;font-size:15px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;border:1.5px solid #008080;">
                      ${manageLabel}
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0;font-size:15px;color:#1a1a1a;line-height:1.7;">
                Keep writing,<br />
                <strong>The Legacy Building Journals Team</strong>
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;background:#f2f2f2;border-top:1px solid #e6e6e6;">
              <p style="margin:0;font-size:12px;color:#8a8a8a;line-height:1.6;">
                You're receiving this because you started a free trial on Legacy Building Journals.<br />
                © Legacy Building Journals. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Dev-only: send the trial reminder email immediately to the signed-in user.
 * Requires ALLOW_BILLING_RESET=true in Convex env (same flag as billing reset).
 * Pass `provider` to preview the store-specific "manage" button (defaults web).
 */
export const sendTestTrialReminder = action({
	args: {
		provider: v.optional(
			v.union(v.literal("stripe"), v.literal("apple"), v.literal("google")),
		),
	},
	returns: v.object({ sent: v.boolean(), to: v.string() }),
	handler: async (ctx, args): Promise<{ sent: boolean; to: string }> => {
		if (process.env.ALLOW_BILLING_RESET !== "true") {
			throw new ConvexError({
				code: "FORBIDDEN",
				message:
					"Test emails are disabled. Set ALLOW_BILLING_RESET=true in Convex environment variables (dev only).",
			});
		}

		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new ConvexError({
				code: "UNAUTHENTICATED",
				message: "You must be signed in.",
			});
		}

		const user = await ctx.runQuery(internal.user.queries.getTrialUserInfo, {
			clerkId: identity.subject,
		});
		if (!user) {
			throw new ConvexError({
				code: "NOT_FOUND",
				message: "User not found.",
			});
		}

		const apiKey = process.env.RESEND_API_KEY;
		if (!apiKey) {
			throw new ConvexError({
				code: "MISCONFIGURED",
				message: "Missing RESEND_API_KEY in Convex environment variables.",
			});
		}

		const firstName = user.name.split(" ")[0] ?? user.name;
		const appUrl =
			process.env.APP_URL ?? "https://app.legacybuildingjournals.com";
		const journalUrl = appUrl + "/dashboard";
		const manage = resolveManageDestination(
			args.provider ?? "stripe",
			appUrl + "/dashboard/billing",
		);

		const resend = new Resend(apiKey);
		const { error } = await resend.emails.send({
			from: "Legacy Building Journals <hello@legacybuildingjournals.com>",
			to: [user.email],
			subject: `${firstName}, your trial ends in 2 days`,
			html: buildTrialReminderHtml({
				firstName,
				journalUrl,
				manageUrl: manage.url,
				manageLabel: manage.label,
			}),
		});

		if (error) {
			throw new ConvexError({
				code: "SEND_FAILED",
				message: `Resend error: ${error.message}`,
			});
		}

		return { sent: true, to: user.email };
	},
});
