import { useSignIn } from "@clerk/expo";
import { zodResolver } from "@hookform/resolvers/zod";
import { type Href, useRouter } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Text, View } from "react-native";

import { AuthCodeField } from "@/components/auth/auth-code-field";
import { AuthField } from "@/components/auth/auth-field";
import { AuthHeader } from "@/components/auth/auth-header";
import { AuthPrimaryButton } from "@/components/auth/auth-primary-button";
import { AuthScreen } from "@/components/auth/auth-screen";
import {
	type ForgotPasswordEmailFormValues,
	forgotPasswordEmailSchema,
	type NewPasswordFormValues,
	newPasswordSchema,
} from "@/lib/auth/schemas";

function pushDecoratedUrl(
	router: ReturnType<typeof useRouter>,
	decorateUrl: (url: string) => string,
	href: string,
) {
	const url = decorateUrl(href);
	const nextHref = url.startsWith("http") ? new URL(url).pathname : url;
	router.replace(nextHref as Href);
}

export default function ForgotPasswordPage() {
	const { signIn, errors, fetchStatus } = useSignIn();
	const router = useRouter();
	const [codeRootError, setCodeRootError] = useState<string | undefined>();

	const emailForm = useForm<ForgotPasswordEmailFormValues>({
		resolver: zodResolver(forgotPasswordEmailSchema),
		defaultValues: { email: "" },
	});
	const passwordForm = useForm<NewPasswordFormValues>({
		resolver: zodResolver(newPasswordSchema),
		defaultValues: { password: "" },
	});

	const sendCode = emailForm.handleSubmit(async ({ email }) => {
		if (!signIn) return;
		const { error: createError } = await signIn.create({
			identifier: email.trim(),
		});
		if (createError) {
			emailForm.setError("root", {
				message: createError.longMessage ?? "Could not start password reset.",
			});
			return;
		}
		const { error: sendError } = await signIn.resetPasswordEmailCode.sendCode();
		if (sendError) {
			emailForm.setError("root", {
				message: sendError.longMessage ?? "Could not send reset email.",
			});
		}
	});

	const verifyCode = async (code: string) => {
		if (!signIn) return;
		setCodeRootError(undefined);
		const { error } = await signIn.resetPasswordEmailCode.verifyCode({ code });
		if (error) {
			setCodeRootError(error.longMessage ?? "Could not verify reset code.");
		}
	};

	const resendCode = async () => {
		if (!signIn) return;
		setCodeRootError(undefined);
		const { error } = await signIn.resetPasswordEmailCode.sendCode();
		if (error) {
			setCodeRootError(error.longMessage ?? "Could not send a new code.");
		}
	};

	const submitPassword = passwordForm.handleSubmit(async ({ password }) => {
		if (!signIn) return;
		const { error } = await signIn.resetPasswordEmailCode.submitPassword({
			password,
		});
		if (error) {
			passwordForm.setError("root", {
				message: error.longMessage ?? "Could not update password.",
			});
			return;
		}
		if (signIn.status === "complete") {
			await signIn.finalize({
				navigate: ({ session, decorateUrl }) => {
					if (session?.currentTask) return;
					pushDecoratedUrl(router, decorateUrl, "/(tabs)");
				},
			});
			return;
		}
		passwordForm.setError("root", {
			message: "Password reset could not be completed.",
		});
	});

	if (signIn.status === "needs_new_password") {
		const fieldErrors = passwordForm.formState.errors;
		return (
			<AuthScreen
				header={
					<AuthHeader
						title="Reset Password"
						backHref="/sign-in"
						backLabel="Log in"
					/>
				}
			>
				<View className="gap-5">
					<AuthField
						label="New password"
						secureTextEntry
						value={passwordForm.watch("password")}
						onChangeText={(v) => passwordForm.setValue("password", v)}
						error={
							fieldErrors.password?.message ?? errors.fields.password?.message
						}
					/>
					{fieldErrors.root?.message ? (
						<Text className="text-red-300 text-xs">
							{fieldErrors.root.message}
						</Text>
					) : null}
					<AuthPrimaryButton
						label="Update password"
						onPress={submitPassword}
						loading={fetchStatus === "fetching"}
					/>
				</View>
			</AuthScreen>
		);
	}

	if (signIn.status === "needs_first_factor") {
		return (
			<AuthScreen
				header={
					<AuthHeader
						title="Reset Password"
						backHref="/sign-in"
						backLabel="Log in"
					/>
				}
			>
				<AuthCodeField
					hint="Check your email for a reset code."
					fieldError={errors.fields.code?.message}
					rootError={codeRootError}
					loading={fetchStatus === "fetching"}
					onVerify={verifyCode}
					onResend={resendCode}
				/>
			</AuthScreen>
		);
	}

	const fieldErrors = emailForm.formState.errors;

	return (
		<AuthScreen
			header={
				<AuthHeader
					title="Reset Password"
					backHref="/sign-in"
					backLabel="Log in"
				/>
			}
		>
			<View className="gap-5">
				<Text className="text-base text-primary-foreground leading-6">
					Enter the email associated with your account
				</Text>
				<Controller
					control={emailForm.control}
					name="email"
					render={({ field: { onChange, value } }) => (
						<AuthField
							hideLabel
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
				{fieldErrors.root?.message ? (
					<Text className="text-red-300 text-xs">
						{fieldErrors.root.message}
					</Text>
				) : null}
				<AuthPrimaryButton
					label="Send Reset Email"
					onPress={sendCode}
					loading={fetchStatus === "fetching"}
				/>
			</View>
		</AuthScreen>
	);
}
