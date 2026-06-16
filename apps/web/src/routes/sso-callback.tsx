import { useClerk, useSignIn, useSignUp } from "@clerk/react";
import { PageLoader } from "@legacy-building/ui/components/page-loader";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { ROUTES } from "@/lib/routes";

export const Route = createFileRoute("/sso-callback")({
	component: SsoCallbackPage,
});

type SignUpResource = NonNullable<ReturnType<typeof useSignUp>["signUp"]>;
type SignInResource = NonNullable<ReturnType<typeof useSignIn>["signIn"]>;
type ClerkInstance = ReturnType<typeof useClerk>;

function emailFromSignUp(
	signUp: SignUpResource,
	signIn: SignInResource,
): string {
	if (signUp.emailAddress) return signUp.emailAddress;
	const identifier = signIn.identifier ?? "";
	if (identifier.includes("@")) return identifier;
	return "";
}

function usernameFromEmail(email: string): string {
	const local = email.split("@")[0]?.replace(/[^a-zA-Z0-9_]/g, "") ?? "";
	return local.length >= 2 ? local : "user";
}

async function activateAndGoDashboard(
	clerk: ClerkInstance,
	sessionId: string | null | undefined,
) {
	if (!sessionId) {
		throw new Error("No session id after sign-up/sign-in");
	}
	await clerk.setActive({ session: sessionId });
	window.location.href = ROUTES.dashboard;
}

async function autoCompleteSignUp(
	signUp: SignUpResource,
	signIn: SignInResource,
	clerk: ClerkInstance,
) {
	const email = emailFromSignUp(signUp, signIn);
	const baseUsername = usernameFromEmail(email);

	const payload: Record<string, unknown> = {};

	if (signUp.missingFields?.includes("first_name")) {
		payload.firstName = baseUsername;
	}
	if (signUp.missingFields?.includes("last_name")) {
		payload.lastName = baseUsername;
	}
	if (signUp.missingFields?.includes("legal_accepted")) {
		payload.legalAccepted = true;
	}

	const needsUsername =
		signUp.missingFields?.includes("username") ||
		(signUp.missingFields?.length === 0 &&
			(signUp.status as string) === "missing_requirements");

	if (needsUsername && baseUsername) {
		for (let i = 0; i < 3; i++) {
			const username =
				i === 0
					? baseUsername
					: `${baseUsername}${Math.floor(Math.random() * 9000) + 1000}`;
			payload.username = username;

			const { error } = await signUp.update(payload as never);

			if (!error) break;
		}
	} else if (Object.keys(payload).length > 0) {
		await signUp.update(payload as never);
	}

	if (signUp.status === "complete" && signUp.createdSessionId) {
		await activateAndGoDashboard(clerk, signUp.createdSessionId);
		return;
	}

	throw new Error(
		`Sign-up still incomplete: status=${signUp.status}, missing=${signUp.missingFields?.join(",")}`,
	);
}

function SsoCallbackPage() {
	const clerk = useClerk();
	const { signIn } = useSignIn();
	const { signUp } = useSignUp();
	const hasRun = useRef(false);

	useEffect(() => {
		if (!clerk.loaded || hasRun.current || !signIn || !signUp) return;
		hasRun.current = true;

		void (async () => {
			try {
				// Existing user — sign-in complete
				if (signIn.status === "complete" && signIn.createdSessionId) {
					await activateAndGoDashboard(clerk, signIn.createdSessionId);
					return;
				}

				// New user — sign-up already complete
				if (signUp.status === "complete" && signUp.createdSessionId) {
					await activateAndGoDashboard(clerk, signUp.createdSessionId);
					return;
				}

				// Existing user tried sign-up OAuth → transfer to sign-in
				if (signUp.isTransferable) {
					const { error } = await signIn.create({ transfer: true });
					if (error) throw error;
					if (
						(signIn.status as string) === "complete" &&
						signIn.createdSessionId
					) {
						await activateAndGoDashboard(clerk, signIn.createdSessionId);
						return;
					}
					window.location.href = ROUTES.login;
					return;
				}

				if (
					signIn.status === "needs_first_factor" &&
					!signIn.supportedFirstFactors?.every(
						(f) => f.strategy === "enterprise_sso",
					)
				) {
					window.location.href = ROUTES.login;
					return;
				}

				// New user tried sign-in OAuth → transfer to sign-up (needs visible captcha!)
				if (signIn.isTransferable) {
					const { error } = await signUp.create({ transfer: true });
					if (error) throw error;

					if (signUp.status === "complete" && signUp.createdSessionId) {
						await activateAndGoDashboard(clerk, signUp.createdSessionId);
						return;
					}

					await autoCompleteSignUp(signUp, signIn, clerk);
					return;
				}

				// Sign-up waiting on fields (OAuth landed on sign-up directly)
				if (
					(signUp.status as string) === "missing_requirements" ||
					(signUp.missingFields && signUp.missingFields.length > 0)
				) {
					await autoCompleteSignUp(signUp, signIn, clerk);
					return;
				}

				if (
					signIn.status === "needs_second_factor" ||
					signIn.status === "needs_new_password"
				) {
					window.location.href = ROUTES.login;
					return;
				}

				if (signIn.existingSession || signUp.existingSession) {
					const sessionId =
						signIn.existingSession?.sessionId ||
						signUp.existingSession?.sessionId;
					if (sessionId) {
						await activateAndGoDashboard(clerk, sessionId);
						return;
					}
				}

				window.location.href = ROUTES.login;
			} catch {
				window.location.href = ROUTES.login;
			}
		})();
	}, [clerk, clerk.loaded, signIn, signUp]);

	return (
		<>
			<PageLoader message="Finishing sign-in…" />
			{/* Must be visible — hidden captcha blocks signUp.create({ transfer: true }) */}
			<div id="clerk-captcha" />
		</>
	);
}
