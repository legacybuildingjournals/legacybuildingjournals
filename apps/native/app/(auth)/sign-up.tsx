import { useAuth, useSignUp } from "@clerk/expo";
import { zodResolver } from "@hookform/resolvers/zod";
import { firstClerkErrorMessage } from "@legacy-building/ui/lib/clerk-errors";
import { type Href, useRouter } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Text, View } from "react-native";
import { AppleOAuthButton } from "@/components/apple-oauth-button";
import { AuthField } from "@/components/auth/auth-field";
import { AuthHeader } from "@/components/auth/auth-header";
import { AuthPrimaryButton } from "@/components/auth/auth-primary-button";
import { AuthScreen } from "@/components/auth/auth-screen";
import { SignupTermsRow } from "@/components/auth/signup-terms-row";
import { GoogleOAuthButton } from "@/components/google-oauth-button";
import { type SignUpFormValues, signUpSchema } from "@/lib/auth/schemas";

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

export default function SignUpPage() {
	const { signUp, errors, fetchStatus } = useSignUp();
	const { isSignedIn } = useAuth();
	const router = useRouter();
	const [acceptTerms, setAcceptTerms] = useState(false);
	const [termsError, setTermsError] = useState<string | undefined>();

	const form = useForm<SignUpFormValues>({
		resolver: zodResolver(signUpSchema),
		defaultValues: { email: "", password: "", confirmPassword: "" },
	});

	const onSubmit = form.handleSubmit(async ({ email, password }) => {
		const { error } = await signUp.password({
			emailAddress: email.trim(),
			password,
		});

		if (error) {
			form.setError("root", {
				message: error.longMessage ?? "Unable to sign up. Please try again.",
			});
			return;
		}

		const { error: sendError } = await signUp.verifications.sendEmailCode();
		if (sendError) {
			form.setError("root", {
				message:
					firstClerkErrorMessage(sendError) ??
					"Could not send verification email.",
			});
			return;
		}
		router.push("/verify-email" as Href);
	});

	const handleSignUp = () => {
		if (!acceptTerms) {
			setTermsError(
				"You must agree to the Terms of Service and Privacy Policy.",
			);
			return;
		}
		setTermsError(undefined);
		void onSubmit();
	};

	if (signUp.status === "complete" || isSignedIn) {
		return null;
	}

	const fieldErrors = form.formState.errors;

	return (
		<AuthScreen
			header={
				<AuthHeader
					title="Create Your Account"
					backHref="/(auth)"
					backLabel="Back"
				/>
			}
		>
			<View className="gap-5">
				<Controller
					control={form.control}
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
								fieldErrors.email?.message ??
								errors.fields.emailAddress?.message
							}
						/>
					)}
				/>
				<Controller
					control={form.control}
					name="password"
					render={({ field: { onChange, value } }) => (
						<AuthField
							label="Password"
							value={value}
							onChangeText={onChange}
							secureTextEntry
							autoComplete="new-password"
							error={
								fieldErrors.password?.message ?? errors.fields.password?.message
							}
							helper={
								<Text className="text-primary-foreground/90 text-xs leading-[17px]">
									Passwords must be at least 8 characters long, and include a
									number, a capital letter, and a symbol.
								</Text>
							}
						/>
					)}
				/>
				<Controller
					control={form.control}
					name="confirmPassword"
					render={({ field: { onChange, value } }) => (
						<AuthField
							label="Confirm Password"
							value={value}
							onChangeText={onChange}
							secureTextEntry
							autoComplete="new-password"
							error={fieldErrors.confirmPassword?.message}
						/>
					)}
				/>

				<SignupTermsRow
					checked={acceptTerms}
					onToggle={() => {
						setAcceptTerms((v) => !v);
						setTermsError(undefined);
					}}
					error={termsError}
				/>

				{fieldErrors.root?.message ? (
					<Text className="text-red-300 text-xs">
						{fieldErrors.root.message}
					</Text>
				) : null}

				<AuthPrimaryButton
					label="Sign Up"
					onPress={handleSignUp}
					loading={fetchStatus === "fetching"}
				/>

				<OrDivider />

				<AppleOAuthButton />
				<GoogleOAuthButton />
			</View>
			<View nativeID="clerk-captcha" />
		</AuthScreen>
	);
}
