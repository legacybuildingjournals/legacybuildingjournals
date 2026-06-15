import { useAuth, useClerk, useSignIn } from "@clerk/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "@legacy-building/backend/convex/_generated/api";
import {
	combinedFieldErrors,
	fieldHasError,
	hasClerkFieldErrors,
} from "@legacy-building/ui/components/auth-field-error";
import { Button } from "@legacy-building/ui/components/button";
import {
	Field,
	FieldError,
	FieldLabel,
} from "@legacy-building/ui/components/field";
import { Input } from "@legacy-building/ui/components/input";
import {
	firstClerkErrorCode,
	firstClerkErrorMessage,
} from "@legacy-building/ui/lib/clerk-errors";
import { useNavigate } from "@tanstack/react-router";
import { useConvex } from "convex/react";
import { Loader2, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { adminPrimaryButtonClass } from "@/lib/admin-theme";
import { type SignInFormValues, signInSchema } from "@/lib/auth/schemas";
import { ROUTES } from "@/lib/routes";

const authFieldClass =
	"h-12 rounded-full border-border bg-popover px-5 text-base shadow-sm placeholder:text-muted-foreground transition-shadow focus-visible:shadow-md md:text-sm";

const NOT_ADMIN_MESSAGE = "This account doesn't have admin access.";

export function AdminSignInForm() {
	const { isSignedIn } = useAuth();
	const { signIn, errors, fetchStatus } = useSignIn();
	const clerk = useClerk();
	const convex = useConvex();
	const navigate = useNavigate();

	const [verifyingAdmin, setVerifyingAdmin] = useState(false);

	const form = useForm<SignInFormValues>({
		resolver: zodResolver(signInSchema),
		defaultValues: { email: "", password: "" },
	});

	const redirectIfAdmin = async (email: string) => {
		const isAdmin = await convex.query(api.user.queries.isAdminByEmail, {
			email: email.trim(),
		});
		if (isAdmin) {
			toast.success("Welcome back.");
			navigate({ to: ROUTES.dashboard });
			return true;
		}
		return false;
	};

	const onSubmit = form.handleSubmit(async ({ email, password }) => {
		form.clearErrors("root");

		if (isSignedIn) {
			setVerifyingAdmin(true);
			try {
				const redirected = await redirectIfAdmin(email);
				if (!redirected) {
					form.setError("root", { message: NOT_ADMIN_MESSAGE });
					toast.error(NOT_ADMIN_MESSAGE);
				}
			} catch (err) {
				const msg =
					firstClerkErrorMessage(err) ?? "Could not verify admin access.";
				form.setError("root", { message: msg });
				toast.error(msg);
			} finally {
				setVerifyingAdmin(false);
			}
			return;
		}

		if (!signIn) return;

		const { error: signInError } = await signIn.password({
			emailAddress: email.trim(),
			password,
		});

		if (signInError) {
			const code = firstClerkErrorCode(signInError);
			const message = firstClerkErrorMessage(signInError);
			if (
				code === "session_exists" ||
				message?.toLowerCase().includes("already signed in")
			) {
				setVerifyingAdmin(true);
				try {
					const redirected = await redirectIfAdmin(email);
					if (!redirected) {
						form.setError("root", { message: NOT_ADMIN_MESSAGE });
						toast.error(NOT_ADMIN_MESSAGE);
					}
				} catch (err) {
					const msg =
						firstClerkErrorMessage(err) ?? "Could not verify admin access.";
					form.setError("root", { message: msg });
					toast.error(msg);
				} finally {
					setVerifyingAdmin(false);
				}
				return;
			}
			if (code === "form_identifier_not_found") {
				form.setError("root", {
					message: "No admin account found for this email.",
				});
				toast.error("No admin account found for this email.");
				return;
			}
			if (code === "form_password_incorrect") {
				form.setError("root", { message: "Incorrect password." });
				toast.error("Incorrect password.");
				return;
			}
			if (!hasClerkFieldErrors(errors.fields)) {
				const msg = firstClerkErrorMessage(signInError) ?? "Sign-in failed.";
				form.setError("root", { message: msg });
				toast.error(msg);
			}
			return;
		}

		if (signIn.status === "complete") {
			if (!signIn.createdSessionId) {
				const msg = "Sign-in finished but no session was created.";
				form.setError("root", { message: msg });
				toast.error(msg);
				return;
			}

			setVerifyingAdmin(true);
			try {
				const isAdmin = await convex.query(api.user.queries.isAdminByEmail, {
					email: email.trim(),
				});

				if (!isAdmin) {
					await signIn.reset();
					form.setError("root", { message: NOT_ADMIN_MESSAGE });
					toast.error(NOT_ADMIN_MESSAGE);
					return;
				}

				await clerk.setActive({ session: signIn.createdSessionId });
				toast.success("Welcome back.");
				navigate({ to: ROUTES.dashboard });
			} catch (err) {
				await signIn.reset().catch(console.error);
				const msg =
					firstClerkErrorMessage(err) ?? "Could not complete sign in.";
				form.setError("root", { message: msg });
				toast.error(msg);
			} finally {
				setVerifyingAdmin(false);
			}
			return;
		}

		if (signIn.status === "needs_second_factor") {
			const msg =
				"Additional verification is required. Contact an administrator.";
			form.setError("root", { message: msg });
			toast.error("Additional verification required.");
			return;
		}

		const fallback = "Sign-in could not be completed. Try again.";
		form.setError("root", { message: fallback });
		toast.error(fallback);
	});

	const rootError = form.formState.errors.root;
	const isSubmitting =
		fetchStatus === "fetching" || form.formState.isSubmitting;
	const isBusy = isSubmitting || verifyingAdmin;

	return (
		<form
			onSubmit={onSubmit}
			className="fade-in-50 slide-in-from-bottom-2 flex animate-in flex-col gap-4 duration-300"
			noValidate
		>
			<Controller
				name="email"
				control={form.control}
				render={({ field, fieldState }) => {
					const clerkMessage = errors.fields.identifier?.message;
					const invalid = fieldHasError(fieldState.invalid, clerkMessage);
					return (
						<Field data-invalid={invalid}>
							<FieldLabel htmlFor={field.name} className="sr-only">
								Email
							</FieldLabel>
							<Input
								{...field}
								id={field.name}
								type="email"
								autoComplete="email"
								placeholder="Email"
								className={authFieldClass}
								disabled={isBusy}
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
							<FieldLabel htmlFor={field.name} className="sr-only">
								Password
							</FieldLabel>
							<Input
								{...field}
								id={field.name}
								type="password"
								autoComplete="current-password"
								placeholder="Password"
								className={authFieldClass}
								disabled={isBusy}
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

			{rootError && !hasClerkFieldErrors(errors.fields) ? (
				<FieldError errors={[rootError]} className="text-sm" />
			) : null}

			<Button
				type="submit"
				variant="default"
				disabled={isBusy}
				className={`mt-1 h-12 w-full rounded-full font-semibold text-base transition-transform active:scale-[0.98] ${adminPrimaryButtonClass}`}
			>
				{verifyingAdmin ? (
					<>
						<ShieldCheck className="size-4 animate-pulse" aria-hidden />
						Verifying admin access…
					</>
				) : isSubmitting ? (
					<>
						<Loader2 className="size-4 animate-spin" aria-hidden />
						Signing in…
					</>
				) : (
					"Sign in"
				)}
			</Button>
		</form>
	);
}
