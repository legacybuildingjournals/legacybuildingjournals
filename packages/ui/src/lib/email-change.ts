import { firstClerkErrorCode, firstClerkErrorMessage } from "./clerk-errors";

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const EMAIL_IN_USE_MESSAGE =
	"That email is already linked to another account. Choose a different email.";

export function clerkErrorMessage(err: unknown, fallback: string): string {
	return firstClerkErrorMessage(err) ?? fallback;
}

export function emailChangeErrorMessage(
	err: unknown,
	fallback: string,
): string {
	const clerkCode = firstClerkErrorCode(err);
	if (
		clerkCode === "form_identifier_exists" ||
		clerkCode === "identifier_already_signed_up"
	) {
		return EMAIL_IN_USE_MESSAGE;
	}
	if (isConnectedAccountDestroyError(err)) {
		return "That email is linked to your sign-in provider and cannot be removed.";
	}
	return clerkErrorMessage(err, fallback);
}

export function isEmailAddressVerified(emailAddress: {
	verification?: { status?: unknown } | null;
}): boolean {
	return emailAddress.verification?.status === "verified";
}

export function isVerificationAlreadyVerifiedError(err: unknown): boolean {
	const code = firstClerkErrorCode(err);
	if (code === "verification_already_verified") {
		return true;
	}
	const message = firstClerkErrorMessage(err)?.toLowerCase() ?? "";
	return message.includes("already been verified");
}

export const WRONG_VERIFICATION_CODE_MESSAGE =
	"Wrong verification code. Please try again.";

export function isWrongVerificationCodeError(err: unknown): boolean {
	const code = firstClerkErrorCode(err);
	if (
		code === "form_code_incorrect" ||
		code === "verification_failed" ||
		code === "form_param_format_invalid"
	) {
		return true;
	}
	const message = firstClerkErrorMessage(err)?.toLowerCase() ?? "";
	return (
		message.includes("incorrect") ||
		message.includes("wrong") ||
		message.includes("invalid code") ||
		message.includes("is invalid")
	);
}

export function verificationCodeErrorMessage(
	err: unknown,
	fallback: string,
): string {
	if (isWrongVerificationCodeError(err)) {
		return WRONG_VERIFICATION_CODE_MESSAGE;
	}
	if (isVerificationAlreadyVerifiedError(err)) {
		return "Verification session expired. Click Resend code and try again.";
	}
	return clerkErrorMessage(err, fallback);
}

export function isReverificationRequiredError(err: unknown): boolean {
	const code = firstClerkErrorCode(err);
	if (
		code === "session_reverification_required" ||
		code === "reverification_required"
	) {
		return true;
	}
	const message = firstClerkErrorMessage(err)?.toLowerCase() ?? "";
	return message.includes("additional verification");
}

export function isConnectedAccountDestroyError(err: unknown): boolean {
	const message = firstClerkErrorMessage(err)?.toLowerCase() ?? "";
	return message.includes("connected account");
}

type ExternalAccountLike = {
	emailAddress?: string | null;
};

export type EmailChangeUserContext<T> = {
	emailAddresses: ReadonlyArray<T>;
	reload: () => Promise<unknown>;
	externalAccounts?: ReadonlyArray<ExternalAccountLike>;
};

export function isConnectedAccountEmail(
	user: { externalAccounts?: ReadonlyArray<ExternalAccountLike> },
	email: string,
): boolean {
	const normalized = email.trim().toLowerCase();
	return (
		user.externalAccounts?.some((account) => {
			const externalEmail = account.emailAddress?.trim().toLowerCase();
			return Boolean(externalEmail && externalEmail === normalized);
		}) ?? false
	);
}

export type EmailChangeVerificationMode = "email_address" | "session";

export type EmailChangeVerificationStart<T extends DestroyableEmail> = {
	pending: T;
	mode: EmailChangeVerificationMode;
};

export type EmailChangeSession = {
	startVerification?: (params: { level: "first_factor" }) => Promise<unknown>;
	prepareFirstFactorVerification?: (params: {
		strategy: "email_code";
		emailAddressId: string;
	}) => Promise<unknown>;
	attemptFirstFactorVerification?: (params: {
		strategy: "email_code";
		code: string;
	}) => Promise<unknown>;
};

type DestroyableEmail = {
	id: string;
	emailAddress: string;
	destroy: () => Promise<unknown>;
	prepareVerification: (params: { strategy: "email_code" }) => Promise<unknown>;
	attemptVerification: (params: { code: string }) => Promise<unknown>;
	verification?: { status?: unknown } | null;
};

export function findUserEmailAddress<T extends DestroyableEmail>(
	user: { emailAddresses: ReadonlyArray<T> },
	target: { id: string; emailAddress: string },
): T | undefined {
	return (
		user.emailAddresses.find((address) => address.id === target.id) ??
		user.emailAddresses.find(
			(address) =>
				address.emailAddress.toLowerCase() ===
				target.emailAddress.toLowerCase(),
		)
	);
}

function isIdentifierExistsError(err: unknown): boolean {
	const code = firstClerkErrorCode(err);
	return (
		code === "form_identifier_exists" || code === "identifier_already_signed_up"
	);
}

async function safeDestroyEmailAddress<T extends DestroyableEmail>(
	user: EmailChangeUserContext<T>,
	address: T,
): Promise<boolean> {
	if (isConnectedAccountEmail(user, address.emailAddress)) {
		return false;
	}

	try {
		await address.destroy();
		return true;
	} catch (err) {
		if (isConnectedAccountDestroyError(err)) {
			return false;
		}
		throw err;
	}
}

async function createPendingEmailAddress<T extends DestroyableEmail>(
	user: EmailChangeUserContext<T>,
	normalized: string,
	createEmailAddress: (email: string) => Promise<T>,
	findOnUser: () => T | undefined,
): Promise<T> {
	try {
		const created = await createEmailAddress(normalized);
		await user.reload();
		return (
			findOnUser() ??
			findUserEmailAddress(user, created) ??
			user.emailAddresses.find((address) => address.id === created.id) ??
			created
		);
	} catch (err) {
		if (!isIdentifierExistsError(err)) {
			throw err;
		}

		await user.reload();
		const existing = findOnUser();
		if (!existing) {
			throw err;
		}
		return existing;
	}
}

async function ensurePendingEmailForVerification<T extends DestroyableEmail>(
	user: EmailChangeUserContext<T>,
	normalized: string,
	createEmailAddress: (email: string) => Promise<T>,
): Promise<T> {
	const findOnUser = () =>
		user.emailAddresses.find(
			(address) => address.emailAddress.toLowerCase() === normalized,
		);

	const linkedToConnectedAccount = isConnectedAccountEmail(user, normalized);

	await user.reload();
	let pending = findOnUser();

	if (pending && isEmailAddressVerified(pending) && !linkedToConnectedAccount) {
		if (await safeDestroyEmailAddress(user, pending)) {
			await user.reload();
			pending = undefined;
		}
	}

	if (!pending) {
		pending = await createPendingEmailAddress(
			user,
			normalized,
			createEmailAddress,
			findOnUser,
		);
	}

	if (pending && isEmailAddressVerified(pending) && !linkedToConnectedAccount) {
		if (await safeDestroyEmailAddress(user, pending)) {
			await user.reload();
			pending = await createPendingEmailAddress(
				user,
				normalized,
				createEmailAddress,
				findOnUser,
			);
		}
	}

	if (!pending) {
		throw new Error("Could not start a new verification. Please try again.");
	}

	return pending;
}

async function sendVerificationCodeToPending<T extends DestroyableEmail>(
	user: EmailChangeUserContext<T>,
	session: EmailChangeSession | null | undefined,
	pending: T,
): Promise<EmailChangeVerificationMode> {
	await user.reload();
	const freshPending = findUserEmailAddress(user, pending) ?? pending;

	if (!isEmailAddressVerified(freshPending)) {
		await freshPending.prepareVerification({ strategy: "email_code" });
		return "email_address";
	}

	if (!session?.prepareFirstFactorVerification) {
		throw new Error(
			"Could not send a verification code. Please refresh and try again.",
		);
	}

	if (session.startVerification) {
		const verification = (await session.startVerification({
			level: "first_factor",
		})) as {
			supportedFirstFactors?: Array<{
				strategy?: string;
				emailAddressId?: string;
			}> | null;
		};
		const emailFactor = verification.supportedFirstFactors?.find(
			(factor) =>
				factor.strategy === "email_code" &&
				factor.emailAddressId === freshPending.id,
		);

		if (emailFactor?.emailAddressId) {
			await session.prepareFirstFactorVerification({
				strategy: "email_code",
				emailAddressId: emailFactor.emailAddressId,
			});
			return "session";
		}
	}

	await session.prepareFirstFactorVerification({
		strategy: "email_code",
		emailAddressId: freshPending.id,
	});
	return "session";
}

/** Ensure a pending address exists for `email`, then send a code. */
export async function startEmailChangeVerification<T extends DestroyableEmail>(
	user: EmailChangeUserContext<T>,
	email: string,
	createEmailAddress: (email: string) => Promise<T>,
	session?: EmailChangeSession | null,
): Promise<EmailChangeVerificationStart<T>> {
	const normalized = email.trim().toLowerCase();
	const pending = await ensurePendingEmailForVerification(
		user,
		normalized,
		createEmailAddress,
	);
	const mode = await sendVerificationCodeToPending(user, session, pending);
	return { pending, mode };
}

/** Send a new code for an in-progress email change. */
export async function resendEmailChangeVerification<T extends DestroyableEmail>(
	user: EmailChangeUserContext<T>,
	pendingEmail: { id: string; emailAddress: string },
	createEmailAddress: (email: string) => Promise<T>,
	session?: EmailChangeSession | null,
): Promise<EmailChangeVerificationStart<T>> {
	const normalized = pendingEmail.emailAddress.trim().toLowerCase();
	const pending = await ensurePendingEmailForVerification(
		user,
		normalized,
		createEmailAddress,
	);
	const mode = await sendVerificationCodeToPending(user, session, pending);
	return { pending, mode };
}

async function attemptSessionEmailCodeVerification(
	session: EmailChangeSession,
	code: string,
): Promise<void> {
	if (!session.attemptFirstFactorVerification) {
		throw new Error("Could not verify the code. Please refresh and try again.");
	}

	try {
		await session.attemptFirstFactorVerification({
			strategy: "email_code",
			code,
		});
	} catch (err) {
		if (isWrongVerificationCodeError(err)) {
			throw new Error(WRONG_VERIFICATION_CODE_MESSAGE);
		}
		throw err;
	}
}

/** Verify the code sent to the pending address. Throws on wrong code. */
export async function verifyEmailChangeCode<T extends DestroyableEmail>(
	user: EmailChangeUserContext<T>,
	pendingEmail: { id: string; emailAddress: string },
	code: string,
	mode: EmailChangeVerificationMode,
	session?: EmailChangeSession | null,
): Promise<T> {
	const trimmed = code.trim();
	await user.reload();

	const freshPending = findUserEmailAddress(user, pendingEmail);
	if (!freshPending) {
		throw new Error("Verification session expired. Request a new code.");
	}

	if (mode === "session") {
		if (!session) {
			throw new Error(
				"Could not verify the code. Please refresh and try again.",
			);
		}
		await attemptSessionEmailCodeVerification(session, trimmed);

		if (!isEmailAddressVerified(freshPending)) {
			throw new Error(WRONG_VERIFICATION_CODE_MESSAGE);
		}

		return freshPending;
	}

	try {
		await freshPending.attemptVerification({ code: trimmed });
	} catch (err) {
		if (
			isVerificationAlreadyVerifiedError(err) &&
			session?.attemptFirstFactorVerification
		) {
			await attemptSessionEmailCodeVerification(session, trimmed);
		} else if (isVerificationAlreadyVerifiedError(err)) {
			throw new Error(
				"Verification session expired. Click Resend code and try again.",
			);
		} else if (isWrongVerificationCodeError(err)) {
			throw new Error(WRONG_VERIFICATION_CODE_MESSAGE);
		} else {
			throw err;
		}
	}

	await user.reload();

	const verified =
		findUserEmailAddress(user, pendingEmail) ??
		user.emailAddresses.find((address) => address.id === pendingEmail.id);

	if (!verified || !isEmailAddressVerified(verified)) {
		throw new Error(WRONG_VERIFICATION_CODE_MESSAGE);
	}

	return verified;
}

export async function finalizePrimaryEmailChange<T extends DestroyableEmail>(
	user: EmailChangeUserContext<T>,
	targetEmail: T,
	syncCustomerEmail: (args: { email: string }) => Promise<unknown>,
	updatePrimaryEmail: (emailAddressId: string) => Promise<unknown>,
) {
	await updatePrimaryEmail(targetEmail.id);

	await Promise.all(
		user.emailAddresses
			.filter((address) => address.id !== targetEmail.id)
			.filter((address) => !isConnectedAccountEmail(user, address.emailAddress))
			.map((address) => safeDestroyEmailAddress(user, address)),
	);

	await user.reload();
	await syncCustomerEmail({ email: targetEmail.emailAddress });
}
