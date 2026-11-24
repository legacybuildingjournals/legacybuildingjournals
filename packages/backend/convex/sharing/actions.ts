"use node";

import { randomBytes } from "node:crypto";
import { ConvexError, v } from "convex/values";
import { Resend } from "resend";

import { internal } from "../_generated/api";
import { action } from "../_generated/server";
import { webAppOrigin } from "../gifts/helpers";
import { shareClaimPath } from "./helpers";

function escapeHtml(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

/** Longest recipient name we put in the email greeting. */
const RECIPIENT_NAME_MAX = 80;

function buildInviteEmailHtml(args: {
	recipientName?: string;
	authorName: string;
	journalTitle: string;
	claimUrl: string;
}): string {
	const author = escapeHtml(args.authorName);
	const title = escapeHtml(args.journalTitle);
	const greeting = args.recipientName
		? `Hi ${escapeHtml(args.recipientName)},`
		: "Hi,";
	return `<!doctype html><html><body style="margin:0;background:#f6f4ef;font-family:Arial,Helvetica,sans-serif;color:#1a1a1a">
<div style="max-width:560px;margin:0 auto;padding:24px">
  <div style="background:#ffffff;border-radius:16px;padding:28px">
    <p style="margin:0 0 12px">${greeting}</p>
    <p style="margin:0 0 12px"><strong>${author} has invited you to share the journal &ldquo;${title}&rdquo; to build your journey together.</strong></p>
    <p style="margin:0 0 12px">In a shared journal you can add your own entries, view all shared entries, and build memories together.</p>
    <p style="margin:24px 0;text-align:center">
      <a href="${args.claimUrl}" style="display:inline-block;background:#0f766e;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:999px;font-weight:bold">Claim Share Journal Invite</a>
    </p>
    <p style="margin:0;color:#64748b;font-size:13px;text-align:center">Or copy and paste this link in your browser:<br /><a href="${args.claimUrl}" style="color:#0f766e;word-break:break-all">${args.claimUrl}</a></p>
    <p style="margin:16px 0 0;color:#94a3b8;font-size:12px;text-align:center">Create your Legacy Building account with this email address to accept. The invite expires in 30 days.</p>
  </div>
</div></body></html>`;
}

/**
 * Author: invite someone to a journal by email. People who already have an
 * account get no email; they see the invite popup in the app (spec #8).
 * People without an account get the invite email with the claim link.
 * `recipientName` (web form) only personalises the email greeting; the
 * native app doesn't send it.
 */
export const sendInvite = action({
	args: {
		journalId: v.id("journals"),
		email: v.string(),
		recipientName: v.optional(v.string()),
	},
	returns: v.object({ emailSent: v.boolean(), hasAccount: v.boolean() }),
	handler: async (
		ctx,
		args,
	): Promise<{ emailSent: boolean; hasAccount: boolean }> => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new ConvexError({
				code: "UNAUTHENTICATED",
				message: "You must be signed in.",
			});
		}
		const recipientName = args.recipientName?.trim() ?? "";
		if (recipientName.length > RECIPIENT_NAME_MAX) {
			throw new ConvexError({
				code: "INVALID_NAME",
				message: `Keep the name under ${RECIPIENT_NAME_MAX} characters.`,
			});
		}
		const token = randomBytes(24).toString("base64url");
		const invite = await ctx.runMutation(
			internal.sharing.mutations.createInvite,
			{
				journalId: args.journalId,
				authorId: identity.subject,
				email: args.email,
				token,
			},
		);
		if (invite.hasAccount) return { emailSent: false, hasAccount: true };

		const apiKey = process.env.RESEND_API_KEY;
		if (!apiKey) {
			console.error("Missing RESEND_API_KEY; share invite email not sent.");
			return { emailSent: false, hasAccount: false };
		}
		const claimUrl = `${webAppOrigin()}${shareClaimPath(token)}`;
		const resend = new Resend(apiKey);
		const { error } = await resend.emails.send({
			from: "Legacy Building Journals <hello@legacybuildingjournals.com>",
			to: [invite.inviteEmail],
			subject: "Share Journal Invite",
			html: buildInviteEmailHtml({
				recipientName: recipientName || undefined,
				authorName: invite.authorName,
				journalTitle: invite.journalTitle,
				claimUrl,
			}),
		});
		if (error) {
			console.error("Resend error sending share invite:", error.message);
			return { emailSent: false, hasAccount: false };
		}
		await ctx.runMutation(internal.sharing.mutations.markInviteEmailSent, {
			shareId: invite.shareId,
		});
		return { emailSent: true, hasAccount: false };
	},
});
