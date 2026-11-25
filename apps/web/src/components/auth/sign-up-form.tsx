import { useSignUp } from "@clerk/react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
	clerkFieldMessage,
	combinedFieldErrors,
	fieldHasError,
	hasClerkFieldErrors,
} from "@legacy-building/ui/components/auth-field-error";
import { Button } from "@legacy-building/ui/components/button";
import { Checkbox } from "@legacy-building/ui/components/checkbox";
import {
	Field,
	FieldError,
	FieldLabel,
} from "@legacy-building/ui/components/field";
import { Input } from "@legacy-building/ui/components/input";
import { firstClerkErrorMessage } from "@legacy-building/ui/lib/clerk-errors";
import { navigateAfterAuth } from "@legacy-building/ui/lib/navigation";
import { Link, useNavigate } from "@tanstack/react-router";
import { Controller, useForm } from "react-hook-form";
import { PasswordInput } from "@/components/auth/password-input";
import { type SignUpFormValues, signUpSchema } from "@/lib/auth/schemas";
import { signupMetadataFromType } from "@/lib/auth/signup-metadata";
import { ROUTES } from "@/lib/routes";

const authFieldClass =
	"h-11 rounded-lg border-border bg-background px-4 text-base shadow-none placeholder:text-muted-foreground md:text-sm";

const authLabelClass = "font-medium text-foreground text-sm";

const submitButtonClass =
	"mt-2 h-11 w-full rounded-full bg-primary font-semibold text-base text-primary-foreground hover:bg-primary/90";

type Props = {
	/** Optional `?type=` search param (role metadata). */
	signupType?: string;
	/**
	 * Pre-filled, read-only email (gift redemption): the account must be created
	 * for the address the gift was sent to.
	 */
	lockedEmail?: string;
};

export function SignUpForm({ signupType, lockedEmail }: Props) {
	const { signUp, errors, fetchStatus } = useSignUp();
	const navigate = useNavigate();

	const form = useForm<SignUpFormValues>({
		resolver: zodResolver(signUpSchema),
		defaultValues: {
			username: "",
			email: lockedEmail ?? "",
			password: "",
			confirmPassword: "",
			acceptTerms: false as unknown as true,
		},
	});

	const finalizeSignUp = async () => {
		if (!signUp) return;
		const { error } = await signUp.finalize({
			navigate: async ({ session, decorateUrl }) => {
				if (session?.currentTask) return;
				navigateAfterAuth(navigate, decorateUrl(ROUTES.dashboard));
			},
		});
		if (error) {
			console.error(error);
		}
	};

	const onSubmit = form.handleSubmit(async ({ username, email, password }) => {
		form.clearErrors("root");
		if (!signUp) return;

		await signUp.reset();

		const trimmedUsername = username.trim();
		const roleMetadata = signupMetadataFromType(signupType ?? null);
		const { error: signUpError } = await signUp.password({
			emailAddress: email.trim(),
			password,
			username: trimmedUsername,
			...(roleMetadata ? { unsafeMetadata: roleMetadata } : {}),
		});

		if (signUpError) {
			console.error(signUpError);
			form.setError("root", {
				message:
					firstClerkErrorMessage(signUpError) ??
					"Could not sign up. Please try again.",
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

		if (
			signUp.status === "missing_requirements" &&
			signUp.unverifiedFields.includes("email_address") &&
			signUp.missingFields.length === 0
		) {
			navigate({ to: ROUTES.verifyEmail });
			return;
		}

		if (signUp.status === "complete") {
			await finalizeSignUp();
			return;
		}

		navigate({ to: ROUTES.verifyEmail });
	});

	const rootError = form.formState.errors.root;

	return (
		<form onSubmit={onSubmit} className="flex flex-col gap-3" noValidate>
			<Controller
				name="username"
				control={form.control}
				render={({ field, fieldState }) => {
					const clerkMessage = clerkFieldMessage(errors.fields.username);
					const invalid = fieldHasError(fieldState.invalid, clerkMessage);
					return (
						<Field data-invalid={invalid}>
							<FieldLabel htmlFor={field.name} className={authLabelClass}>
								Username
							</FieldLabel>
							<Input
								{...field}
								id={field.name}
								type="text"
								autoComplete="username"
								className={authFieldClass}
								aria-invalid={invalid}
							/>
							{invalid ? (
								<FieldError
									errors={combinedFieldErrors(fieldState.error, clerkMessage)}
								/>
							) : null}
						</Field>
					);
				}}
			/>
			<Controller
				name="email"
				control={form.control}
				render={({ field, fieldState }) => {
					const clerkMessage = errors.fields.emailAddress?.message;
					const invalid = fieldHasError(fieldState.invalid, clerkMessage);
					return (
						<Field data-invalid={invalid}>
							<FieldLabel htmlFor={field.name} className={authLabelClass}>
								Email
							</FieldLabel>
							<Input
								{...field}
								id={field.name}
								type="email"
								autoComplete="email"
								readOnly={Boolean(lockedEmail)}
								aria-readonly={Boolean(lockedEmail)}
								className={
									lockedEmail
										? `${authFieldClass} cursor-not-allowed bg-muted text-muted-foreground`
										: authFieldClass
								}
								aria-invalid={invalid}
							/>
							{invalid ? (
								<FieldError
									errors={combinedFieldErrors(fieldState.error, clerkMessage)}
								/>
							) : null}
						</Field>
					);
				}}
			/>
			<Controller
				name="password"
				control={form.control}
				render={({ field, fieldState }) => {
					const clerkMessage = errors.fields.password?.message;
					const invalid = fieldHasError(fieldState.invalid, clerkMessage);
					return (
						<Field data-invalid={invalid}>
							<FieldLabel htmlFor={field.name} className={authLabelClass}>
								Password
							</FieldLabel>
							<PasswordInput
								{...field}
								id={field.name}
								autoComplete="new-password"
								className={authFieldClass}
								aria-invalid={invalid}
							/>
							{invalid ? (
								<FieldError
									errors={combinedFieldErrors(fieldState.error, clerkMessage)}
								/>
							) : null}
						</Field>
					);
				}}
			/>
			<Controller
				name="confirmPassword"
				control={form.control}
				render={({ field, fieldState }) => (
					<Field data-invalid={fieldState.invalid}>
						<FieldLabel htmlFor={field.name} className={authLabelClass}>
							Confirm Password
						</FieldLabel>
						<PasswordInput
							{...field}
							id={field.name}
							autoComplete="new-password"
							className={authFieldClass}
							aria-invalid={fieldState.invalid}
						/>
						{fieldState.invalid ? (
							<FieldError errors={[fieldState.error]} />
						) : null}
					</Field>
				)}
			/>
			<Controller
				name="acceptTerms"
				control={form.control}
				render={({ field, fieldState }) => (
					<Field data-invalid={fieldState.invalid}>
						<div className="flex items-start gap-2.5">
							<Checkbox
								id={field.name}
								name={field.name}
								checked={field.value === true}
								onCheckedChange={(checked) => field.onChange(checked === true)}
								onBlur={field.onBlur}
								aria-invalid={fieldState.invalid}
								className="mt-0.5 size-[18px] rounded border-primary/60"
							/>
							<label
								htmlFor={field.name}
								className="cursor-pointer select-none text-foreground text-sm leading-snug"
							>
								I agree to the{" "}
								<Link
									to={ROUTES.terms}
									className="underline underline-offset-2 hover:text-primary"
								>
									Terms of Service
								</Link>{" "}
								and{" "}
								<Link
									to={ROUTES.privacy}
									className="underline underline-offset-2 hover:text-primary"
								>
									Privacy Policy
								</Link>
							</label>
						</div>
						{fieldState.invalid ? (
							<FieldError errors={[fieldState.error]} />
						) : null}
					</Field>
				)}
			/>
			{rootError && !hasClerkFieldErrors(errors.fields) ? (
				<FieldError errors={[rootError]} />
			) : null}
			<Button
				type="submit"
				variant="default"
				disabled={fetchStatus === "fetching" || form.formState.isSubmitting}
				className={submitButtonClass}
			>
				Sign Up
			</Button>
			<div id="clerk-captcha" />
		</form>
	);
}
