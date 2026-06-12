import { useSignIn } from "@clerk/expo";
import { zodResolver } from "@hookform/resolvers/zod";
import { firstClerkErrorMessage } from "@legacy-building/ui/lib/clerk-errors";
import { type Href, Link, useRouter } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Pressable, Text, View } from "react-native";

import { AuthCodeField } from "@/components/auth/auth-code-field";
import { AuthField } from "@/components/auth/auth-field";
import { AuthHeader } from "@/components/auth/auth-header";
import { AuthPrimaryButton } from "@/components/auth/auth-primary-button";
import { AuthScreen } from "@/components/auth/auth-screen";
import { GoogleOAuthButton } from "@/components/google-oauth-button";
import { type SignInFormValues, signInSchema } from "@/lib/auth/schemas";

type MfaMethod = "email_code" | "totp" | "phone_code";

function pushDecoratedUrl(
	router: ReturnType<typeof useRouter>,
	decorateUrl: (url: string) => string,
	href: string,
) {
	const url = decorateUrl(href);
	const nextHref = url.startsWith("http") ? new URL(url).pathname : url;
	router.replace(nextHref as Href);
}

function OrDivider() {
	return (
		<View className="my-1 flex-row items-center gap-3">
			<View className="h-px flex-1 bg-white/30" />
			<Text className="font-medium text-primary-foreground/70 text-xs uppercase tracking-widest">
				Or
			</Text>
			<View className="h-px flex-1 bg-white/30" />
		</View>
	);
}

function mfaHint(method: MfaMethod) {
	switch (method) {
		case "email_code":
			return "Enter the code we sent to your email to finish signing in.";
		case "totp":
			return "Enter the code from your authenticator app.";
		case "phone_code":
			return "Enter the code we sent to your phone.";
	}
}

export default function SignInPage() {
	const { signIn, errors, fetchStatus } = useSignIn();
	const router = useRouter();
	const [mfaMethod, setMfaMethod] = useState<MfaMethod | null>(null);
	const [mfaRootError, setMfaRootError] = useState<string | undefined>();

	const credentialsForm = useForm<SignInFormValues>({
		resolver: zodResolver(signInSchema),
		defaultValues: { email: "", password: "" },
	});

	const resetFlow = async () => {
		await signIn.reset();
		setMfaMethod(null);
		setMfaRootError(undefined);
		credentialsForm.clearErrors("root");
	};

	const finalizeSignIn = async () => {
		const { error } = await signIn.finalize({
			navigate: ({ session, decorateUrl }) => {
				if (session?.currentTask) return;
				pushDecoratedUrl(router, decorateUrl, "/(tabs)");
			},
		});
		if (error) {
			console.error(error);
		}
	};

	const beginSecondFactor = async (): Promise<
		{ ok: true; method: MfaMethod } | { ok: false; message: string }
	> => {
		const factors = signIn.supportedSecondFactors ?? [];

		const emailFactor = factors.find((f) => f.strategy === "email_code");
		if (emailFactor) {
			const { error: sendError } = await signIn.mfa.sendEmailCode();
			if (sendError) {
				return {
					ok: false,
					message:
						firstClerkErrorMessage(sendError) ??
						"Could not send verification code.",
				};
			}
			return { ok: true, method: "email_code" };
		}

		const totpFactor = factors.find((f) => f.strategy === "totp");
		if (totpFactor) {
			return { ok: true, method: "totp" };
		}

		const phoneFactor = factors.find((f) => f.strategy === "phone_code");
		if (phoneFactor) {
			const { error: sendError } = await signIn.mfa.sendPhoneCode();
			if (sendError) {
				return {
					ok: false,
					message:
						firstClerkErrorMessage(sendError) ??
						"Could not send verification code.",
				};
			}
			return { ok: true, method: "phone_code" };
		}

		return {
			ok: false,
			message:
				"Additional verification is required. Use another sign-in method or contact support.",
		};
	};

	const onSubmit = credentialsForm.handleSubmit(async ({ email, password }) => {
		credentialsForm.clearErrors("root");

		const { error } = await signIn.password({
			emailAddress: email.trim(),
			password,
		});

		if (error) {
			credentialsForm.setError("root", {
				message: error.longMessage ?? "Unable to sign in. Please try again.",
			});
			return;
		}

		if (signIn.status === "complete") {
			await finalizeSignIn();
			return;
		}

		if (
			signIn.status === "needs_second_factor" ||
			signIn.status === "needs_client_trust"
		) {
			const result = await beginSecondFactor();
			if (!result.ok) {
				credentialsForm.setError("root", { message: result.message });
				return;
			}
			setMfaMethod(result.method);
			return;
		}

		credentialsForm.setError("root", {
			message: "Sign-in could not be completed.",
		});
	});

	const onVerifyCode = async (code: string) => {
		if (!mfaMethod) return;
		setMfaRootError(undefined);

		const { error } =
			mfaMethod === "email_code"
				? await signIn.mfa.verifyEmailCode({ code })
				: mfaMethod === "totp"
					? await signIn.mfa.verifyTOTP({ code })
					: await signIn.mfa.verifyPhoneCode({ code });

		if (error) {
			setMfaRootError(
				error.longMessage ?? "That code did not work. Please try again.",
			);
			return;
		}

		if (signIn.status === "complete") {
			await finalizeSignIn();
		} else {
			setMfaRootError("That code did not complete sign-in. Please try again.");
		}
	};

	const resendCode = async () => {
		if (!mfaMethod || mfaMethod === "totp") return;
		setMfaRootError(undefined);

		const { error } =
			mfaMethod === "email_code"
				? await signIn.mfa.sendEmailCode()
				: await signIn.mfa.sendPhoneCode();

		if (error) {
			setMfaRootError(
				firstClerkErrorMessage(error) ?? "Could not send a new code.",
			);
		}
	};

	if (mfaMethod) {
		const canResend = mfaMethod === "email_code" || mfaMethod === "phone_code";

		return (
			<AuthScreen
				header={
					<AuthHeader title="Log in" backHref="/(auth)" backLabel="Back" />
				}
			>
				<AuthCodeField
					hint={mfaHint(mfaMethod)}
					fieldError={errors.fields.code?.message}
					rootError={mfaRootError}
					loading={fetchStatus === "fetching"}
					onVerify={onVerifyCode}
					onResend={canResend ? resendCode : undefined}
					onStartOver={resetFlow}
				/>
			</AuthScreen>
		);
	}

	const fieldErrors = credentialsForm.formState.errors;

	return (
		<AuthScreen
			header={<AuthHeader title="Log in" backHref="/(auth)" backLabel="Back" />}
		>
			<View className="gap-5">
				<Controller
					control={credentialsForm.control}
					name="email"
					render={({ field: { onChange, value } }) => (
						<AuthField
							label="Email"
							value={value}
							onChangeText={onChange}
							autoCapitalize="none"
							keyboardType="email-address"
							autoComplete="email"
							error={
								fieldErrors.email?.message ?? errors.fields.identifier?.message
							}
						/>
					)}
				/>
				<Controller
					control={credentialsForm.control}
					name="password"
					render={({ field: { onChange, value } }) => (
						<AuthField
							label="Password"
							value={value}
							onChangeText={onChange}
							secureTextEntry
							autoComplete="password"
							error={
								fieldErrors.password?.message ?? errors.fields.password?.message
							}
						/>
					)}
				/>

				<Link href={"/forgot-password" as Href} asChild>
					<Pressable className="-mt-2 active:opacity-60">
						<Text className="text-primary-foreground text-sm">
							Forgot your password?{" "}
							<Text className="font-semibold text-primary-foreground underline">
								Click here
							</Text>
						</Text>
					</Pressable>
				</Link>

				{fieldErrors.root?.message ? (
					<Text className="text-red-300 text-xs">
						{fieldErrors.root.message}
					</Text>
				) : null}

				<AuthPrimaryButton
					label="Log in"
					onPress={onSubmit}
					loading={fetchStatus === "fetching"}
				/>

				<OrDivider />

				<GoogleOAuthButton />
			</View>
		</AuthScreen>
	);
}
