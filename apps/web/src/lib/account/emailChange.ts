export type {
	EmailChangeSession,
	EmailChangeVerificationMode,
	EmailChangeVerificationStart,
} from "@legacy-building/ui/lib/email-change";
export {
	clerkErrorMessage,
	EMAIL_IN_USE_MESSAGE,
	EMAIL_RE,
	emailChangeErrorMessage,
	finalizePrimaryEmailChange,
	findUserEmailAddress,
	isConnectedAccountDestroyError,
	isEmailAddressVerified,
	isReverificationRequiredError,
	isVerificationAlreadyVerifiedError,
	isWrongVerificationCodeError,
	resendEmailChangeVerification,
	startEmailChangeVerification,
	verificationCodeErrorMessage,
	verifyEmailChangeCode,
	WRONG_VERIFICATION_CODE_MESSAGE,
} from "@legacy-building/ui/lib/email-change";
