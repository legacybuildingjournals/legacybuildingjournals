import { useReverification, useSession, useUser } from "@clerk/react";
import {
	isClerkRuntimeError,
	isReverificationCancelledError,
} from "@clerk/react/errors";
import { api } from "@legacy-building/backend/convex/_generated/api";
import { useAction } from "convex/react";
import { Loader2, SquarePen } from "lucide-react";
import { useEffect, useState } from "react";

import {
	accountInputClass,
	accountLabelClass,
	accountPersonalInfoEditButtonClass,
	accountPrimaryButtonClass,
	accountSecondaryButtonClass,
} from "@/components/account/accountFormStyles";
import { Button } from "@/components/journal/ui/button";
import { Input } from "@/components/journal/ui/input";
import {
	EMAIL_RE,
	type EmailChangeVerificationMode,
	emailChangeErrorMessage,
	finalizePrimaryEmailChange,
	isReverificationRequiredError,
	resendEmailChangeVerification,
	startEmailChangeVerification,
	verificationCodeErrorMessage,
	verifyEmailChangeCode,
	WRONG_VERIFICATION_CODE_MESSAGE,
} from "@/lib/account/emailChange";
import { toastMutationError, toastMutationSuccess } from "@/lib/journal/toast";

type AccountEmailSectionProps = {
	currentEmail: string;
};

type ClerkUser = NonNullable<ReturnType<typeof useUser>["user"]>;
type CreatedEmail = Awaited<ReturnType<ClerkUser["createEmailAddress"]>>;

export function AccountEmailSection({
	currentEmail,
}: AccountEmailSectionProps) {
	const { user, isLoaded } = useUser();
	const { session } = useSession();
	const assertEmailAvailable = useAction(
		api.user.actions.assertEmailAvailableForChange,
	);
	const syncCustomerEmail = useAction(api.stripe.actions.syncCustomerEmail);
	const createEmailAddress = useReverification((email: string) =>
		user!.createEmailAddress({ email }),
	);
	const updatePrimaryEmail = useReverification((emailAddressId: string) =>
		user!.update({ primaryEmailAddressId: emailAddressId }),
	);

	const [editing, setEditing] = useState(false);
	const [phase, setPhase] = useState<"form" | "verify">("form");
	const [email, setEmail] = useState(currentEmail);
	const [code, setCode] = useState("");
	const [pendingEmail, setPendingEmail] = useState<CreatedEmail | null>(null);
	const [verificationMode, setVerificationMode] =
		useState<EmailChangeVerificationMode>("email_address");
	const [busy, setBusy] = useState(false);
	const [inlineError, setInlineError] = useState<string | null>(null);
	const [inlineSuccess, setInlineSuccess] = useState<string | null>(null);

	useEffect(() => {
		if (!editing && phase === "form") {
			setEmail(currentEmail);
		}
	}, [currentEmail, editing, phase]);

	const resetFlow = () => {
		setPhase("form");
		setCode("");
		setPendingEmail(null);
		setVerificationMode("email_address");
		setInlineError(null);
		setInlineSuccess(null);
		setEmail(currentEmail);
	};

	const closeEditor = () => {
		setEditing(false);
		resetFlow();
	};

	const handleStartError = (err: unknown, fallback: string) => {
		if (isClerkRuntimeError(err) && isReverificationCancelledError(err)) {
			return "Identity verification was cancelled. Try again when you're ready.";
		}
		if (isReverificationRequiredError(err)) {
			return "Verify your identity to continue updating your email.";
		}
		return emailChangeErrorMessage(err, fallback);
	};

	const handleVerifyError = (err: unknown, fallback: string) => {
		if (isClerkRuntimeError(err) && isReverificationCancelledError(err)) {
			return "Identity verification was cancelled. Try again when you're ready.";
		}
		if (isReverificationRequiredError(err)) {
			return "Verify your identity to finish updating your email.";
		}
		return verificationCodeErrorMessage(err, fallback);
	};

	const handleStartChange = async () => {
		const next = email.trim().toLowerCase();
		setInlineError(null);
		setInlineSuccess(null);

		if (!EMAIL_RE.test(next)) {
			const message = "Enter a valid email address.";
			setInlineError(message);
			toastMutationError(new Error("invalid"), message);
			return;
		}
		if (next === currentEmail.trim().toLowerCase()) {
			const message = "That's already your email address.";
			setInlineError(message);
			toastMutationError(new Error("same"), message);
			return;
		}
		if (!user) return;

		setBusy(true);
		try {
			await assertEmailAvailable({ email: next });

			const { pending, mode } = await startEmailChangeVerification(
				user,
				next,
				createEmailAddress,
				session,
			);

			setPendingEmail(pending);
			setVerificationMode(mode);
			setPhase("verify");
			const sentMessage = `We sent a verification code to ${next}.`;
			setInlineSuccess(sentMessage);
			toastMutationSuccess(sentMessage);
		} catch (err) {
			const message = handleStartError(
				err,
				"Could not start email change. Please try again.",
			);
			setInlineError(message);
			toastMutationError(err, message);
		} finally {
			setBusy(false);
		}
	};

	const handleVerify = async () => {
		if (!user || !pendingEmail) return;

		setInlineError(null);
		setInlineSuccess(null);

		if (code.trim().length < 4) {
			const message = "Enter the verification code we emailed you.";
			setInlineError(message);
			toastMutationError(new Error("code"), message);
			return;
		}

		setBusy(true);
		try {
			const verified = await verifyEmailChangeCode(
				user,
				pendingEmail,
				code,
				verificationMode,
				session,
			);

			await finalizePrimaryEmailChange(
				user,
				verified,
				syncCustomerEmail,
				updatePrimaryEmail,
			);

			toastMutationSuccess("Email updated.");
			closeEditor();
		} catch (err) {
			const message = handleVerifyError(err, WRONG_VERIFICATION_CODE_MESSAGE);
			setInlineError(message);
			toastMutationError(err, message);
		} finally {
			setBusy(false);
		}
	};

	const handleResendCode = async () => {
		if (!user || !pendingEmail) return;

		setInlineError(null);
		setInlineSuccess(null);
		setBusy(true);
		try {
			const { pending, mode } = await resendEmailChangeVerification(
				user,
				pendingEmail,
				createEmailAddress,
				session,
			);
			setPendingEmail(pending);
			setVerificationMode(mode);
			setCode("");

			const sentMessage = `We sent a new code to ${pending.emailAddress}.`;
			setInlineSuccess(sentMessage);
			toastMutationSuccess(sentMessage);
		} catch (err) {
			const message = handleStartError(
				err,
				"Could not resend the verification code. Please try again.",
			);
			setInlineError(message);
			toastMutationError(err, message);
		} finally {
			setBusy(false);
		}
	};

	if (!isLoaded) {
		return null;
	}

	return (
		<div className="flex flex-col gap-1.5">
			<div className="flex items-center gap-1.5">
				<label htmlFor="account-email" className={accountLabelClass}>
					Email
				</label>
				{!editing ? (
					<button
						type="button"
						onClick={() => {
							setEditing(true);
							setEmail(currentEmail);
						}}
						className={accountPersonalInfoEditButtonClass}
						aria-label="Edit email address"
						aria-expanded={false}
					>
						<SquarePen className="size-3.5" strokeWidth={2} aria-hidden />
					</button>
				) : null}
			</div>

			{!editing ? (
				<Input
					id="account-email"
					type="email"
					value={currentEmail}
					readOnly
					disabled
					className={accountInputClass}
					aria-label="Email address"
				/>
			) : phase === "form" ? (
				<div className="flex flex-col gap-3">
					<Input
						id="account-email"
						type="email"
						value={email}
						onChange={(event) => setEmail(event.target.value)}
						className={accountInputClass}
						autoComplete="email"
						disabled={busy}
						aria-invalid={inlineError ? true : undefined}
						aria-describedby={
							inlineError
								? "account-email-error"
								: "account-email-helper account-email-status"
						}
					/>
					<p
						id="account-email-helper"
						className="text-muted-foreground text-sm leading-relaxed"
					>
						We&apos;ll send a verification code to this address. Your email
						won&apos;t change until you enter the correct code.
					</p>
					{inlineError ? (
						<p
							id="account-email-error"
							role="alert"
							className="text-destructive text-sm"
						>
							{inlineError}
						</p>
					) : null}
					{inlineSuccess ? (
						<p
							id="account-email-status"
							role="status"
							className="text-primary text-sm"
						>
							{inlineSuccess}
						</p>
					) : null}
					<div className="flex flex-col gap-2 sm:flex-row sm:items-center">
						<Button
							type="button"
							disabled={busy}
							onClick={() => void handleStartChange()}
							className={accountPrimaryButtonClass}
						>
							{busy ? (
								<>
									<Loader2 className="size-4 animate-spin" aria-hidden />
									Sending code…
								</>
							) : (
								"Send Verification Code"
							)}
						</Button>
						<Button
							type="button"
							variant="outline"
							disabled={busy}
							onClick={closeEditor}
							className={accountSecondaryButtonClass}
						>
							Cancel
						</Button>
					</div>
				</div>
			) : (
				<div className="flex flex-col gap-3">
					<p className="text-muted-foreground text-sm leading-relaxed">
						Enter the verification code we sent to{" "}
						<span className="font-medium text-foreground">
							{pendingEmail?.emailAddress}
						</span>
						. Your email will only update if the code is correct.
					</p>
					<Input
						id="account-email-code"
						type="text"
						inputMode="numeric"
						autoComplete="one-time-code"
						maxLength={6}
						value={code}
						onChange={(event) =>
							setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
						}
						className={accountInputClass}
						disabled={busy}
						placeholder="123456"
						aria-invalid={inlineError ? true : undefined}
						aria-describedby={
							inlineError
								? "account-email-verify-error"
								: "account-email-status"
						}
					/>
					{inlineError ? (
						<p
							id="account-email-verify-error"
							role="alert"
							className="text-destructive text-sm"
						>
							{inlineError}
						</p>
					) : null}
					{inlineSuccess ? (
						<p
							id="account-email-status"
							role="status"
							className="text-primary text-sm"
						>
							{inlineSuccess}
						</p>
					) : null}
					<div className="flex flex-col gap-2 sm:flex-row sm:items-center">
						<Button
							type="button"
							disabled={busy}
							onClick={() => void handleVerify()}
							className={accountPrimaryButtonClass}
						>
							{busy ? (
								<>
									<Loader2 className="size-4 animate-spin" aria-hidden />
									Verifying…
								</>
							) : (
								"Verify & Update Email"
							)}
						</Button>
						<Button
							type="button"
							variant="outline"
							disabled={busy}
							onClick={() => void handleResendCode()}
							className={accountSecondaryButtonClass}
						>
							Resend code
						</Button>
					</div>
					<button
						type="button"
						disabled={busy}
						onClick={resetFlow}
						className="self-start text-primary text-sm transition-colors hover:text-primary/80 disabled:opacity-60"
					>
						Use a different email
					</button>
				</div>
			)}
		</div>
	);
}
