import { useSession, useUser } from "@clerk/expo";
import { api } from "@legacy-building/backend/convex/_generated/api";
import {
	EMAIL_RE,
	type EmailChangeVerificationMode,
	emailChangeErrorMessage,
	finalizePrimaryEmailChange,
	resendEmailChangeVerification,
	startEmailChangeVerification,
	verificationCodeErrorMessage,
	verifyEmailChangeCode,
	WRONG_VERIFICATION_CODE_MESSAGE,
} from "@legacy-building/ui/lib/email-change";
import { useAction } from "convex/react";
import { router } from "expo-router";
import { useThemeColor } from "heroui-native/hooks";
import { useState } from "react";
import {
	ActivityIndicator,
	KeyboardAvoidingView,
	Platform,
	Pressable,
	ScrollView,
	Text,
	TextInput,
	View,
} from "react-native";

import { AccountScreenHeader } from "@/components/account/account-screen-header";
import { useMutationToast } from "@/lib/mutation-toast";

type ClerkUser = NonNullable<ReturnType<typeof useUser>["user"]>;
type CreatedEmail = Awaited<ReturnType<ClerkUser["createEmailAddress"]>>;

export default function ChangeEmailScreen() {
	const { user } = useUser();
	const { session } = useSession();
	const assertEmailAvailable = useAction(
		api.user.actions.assertEmailAvailableForChange,
	);
	const syncCustomerEmail = useAction(api.stripe.actions.syncCustomerEmail);
	const toast = useMutationToast();
	const placeholderColor = useThemeColor("field-placeholder");

	const currentEmail = user?.primaryEmailAddress?.emailAddress ?? "";

	const [phase, setPhase] = useState<"form" | "verify">("form");
	const [email, setEmail] = useState(currentEmail);
	const [code, setCode] = useState("");
	const [pendingEmail, setPendingEmail] = useState<CreatedEmail | null>(null);
	const [verificationMode, setVerificationMode] =
		useState<EmailChangeVerificationMode>("email_address");
	const [busy, setBusy] = useState(false);

	// --- Phase 1: create the new email address + send a verification code -----
	const handleStartChange = async () => {
		const next = email.trim().toLowerCase();
		if (!EMAIL_RE.test(next)) {
			toast.error(new Error("invalid"), "Enter a valid email address.");
			return;
		}
		if (next === currentEmail.trim().toLowerCase()) {
			toast.error(new Error("same"), "That's already your email address.");
			return;
		}
		if (!user) return;

		setBusy(true);
		try {
			await assertEmailAvailable({ email: next });

			// Shared with web. It reuses or recreates the pending address as needed
			// — including destroying one that is already verified from an earlier
			// attempt, which is what otherwise fails with "This verification has
			// already been verified."
			const { pending, mode } = await startEmailChangeVerification(
				user,
				next,
				(address) => user.createEmailAddress({ email: address }),
				session,
			);

			setPendingEmail(pending);
			setVerificationMode(mode);
			setPhase("verify");
			toast.success(`We sent a code to ${next}.`);
		} catch (err) {
			toast.error(
				err,
				emailChangeErrorMessage(
					err,
					"Could not start email change. Please try again.",
				),
			);
		} finally {
			setBusy(false);
		}
	};

	// --- Phase 2: verify the code, promote to primary, sync Stripe + Convex ---
	const handleVerify = async () => {
		if (!user || !pendingEmail) return;
		if (code.trim().length < 4) {
			toast.error(new Error("code"), "Enter the code we emailed you.");
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

			// Promotes to primary, drops every other address, then propagates to
			// Stripe (customer email) + the Convex user row.
			await finalizePrimaryEmailChange(
				user,
				verified,
				syncCustomerEmail,
				(emailAddressId) =>
					user.update({ primaryEmailAddressId: emailAddressId }),
			);

			toast.success("Email updated.");
			router.back();
		} catch (err) {
			toast.error(
				err,
				verificationCodeErrorMessage(err, WRONG_VERIFICATION_CODE_MESSAGE),
			);
		} finally {
			setBusy(false);
		}
	};

	const handleResendCode = async () => {
		if (!user || !pendingEmail) return;

		setBusy(true);
		try {
			const { pending, mode } = await resendEmailChangeVerification(
				user,
				pendingEmail,
				(address) => user.createEmailAddress({ email: address }),
				session,
			);

			setPendingEmail(pending);
			setVerificationMode(mode);
			setCode("");
			toast.success(`We sent a new code to ${pending.emailAddress}.`);
		} catch (err) {
			toast.error(
				err,
				emailChangeErrorMessage(
					err,
					"Could not resend the verification code. Please try again.",
				),
			);
		} finally {
			setBusy(false);
		}
	};

	return (
		<View className="flex-1 bg-background">
			<AccountScreenHeader title="Update Details" />

			<KeyboardAvoidingView
				behavior={Platform.OS === "ios" ? "padding" : undefined}
				className="flex-1"
			>
				<ScrollView
					className="flex-1"
					contentContainerClassName="px-4 pt-6 gap-5"
					keyboardShouldPersistTaps="handled"
				>
					{phase === "form" ? (
						<>
							<View className="gap-2">
								<Text className="font-semibold text-foreground text-lg">
									Email
								</Text>
								<TextInput
									value={email}
									onChangeText={setEmail}
									placeholder="you@example.com"
									placeholderTextColor={placeholderColor}
									keyboardType="email-address"
									autoCapitalize="none"
									autoComplete="email"
									className="h-14 rounded-2xl border border-border bg-background px-4 text-base text-foreground"
								/>
								<Text className="text-muted-foreground text-sm">
									We&apos;ll email a verification code to confirm you own the
									new address.
								</Text>
							</View>

							<Pressable
								onPress={() => void handleStartChange()}
								disabled={busy}
								accessibilityRole="button"
								accessibilityLabel="Update Email"
								className="mt-4 h-14 flex-row items-center justify-center gap-2 rounded-full bg-primary active:opacity-90 disabled:opacity-70"
							>
								{busy ? <ActivityIndicator color="#ffffff" /> : null}
								<Text className="font-semibold text-base text-primary-foreground">
									{busy ? "Sending code…" : "Update Email"}
								</Text>
							</Pressable>
						</>
					) : (
						<>
							<View className="gap-2">
								<Text className="font-semibold text-foreground text-lg">
									Enter Verification Code
								</Text>
								<Text className="text-muted-foreground text-sm">
									We sent a code to {pendingEmail?.emailAddress}. Enter it below
									to confirm your new email.
								</Text>
								<TextInput
									value={code}
									onChangeText={setCode}
									placeholder="123456"
									placeholderTextColor={placeholderColor}
									keyboardType="number-pad"
									autoComplete="one-time-code"
									maxLength={6}
									className="h-14 rounded-2xl border border-border bg-background px-4 text-base text-foreground tracking-[8px]"
								/>
							</View>
							<Pressable
								onPress={() => void handleVerify()}
								disabled={busy}
								accessibilityRole="button"
								accessibilityLabel="Verify and update email"
								className="mt-2 h-14 flex-row items-center justify-center gap-2 rounded-full bg-primary active:opacity-90 disabled:opacity-70"
							>
								{busy ? <ActivityIndicator color="#ffffff" /> : null}
								<Text className="font-semibold text-base text-primary-foreground">
									{busy ? "Verifying…" : "Verify & Update Email"}
								</Text>
							</Pressable>
							<Pressable
								onPress={() => void handleResendCode()}
								disabled={busy}
								accessibilityRole="button"
								accessibilityLabel="Resend code"
								className="items-center py-2 active:opacity-70 disabled:opacity-50"
							>
								<Text className="text-base text-primary">Resend code</Text>
							</Pressable>
							<Pressable
								onPress={() => {
									setPhase("form");
									setCode("");
									setPendingEmail(null);
									setVerificationMode("email_address");
								}}
								disabled={busy}
								accessibilityRole="button"
								accessibilityLabel="Use a different email"
								className="items-center py-2 active:opacity-70"
							>
								<Text className="text-base text-primary">
									Use a different email
								</Text>
							</Pressable>
						</>
					)}
				</ScrollView>
			</KeyboardAvoidingView>
		</View>
	);
}
