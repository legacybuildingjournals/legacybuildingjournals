import { useClerk, useSignIn, useSignUp } from "@clerk/react";
import { imageAssets } from "@legacy-building/assets";
import { Button } from "@legacy-building/ui/components/button";
import { useState } from "react";
import { ROUTES } from "@/lib/routes";

type GoogleAuthButtonSignIn = {
	mode: "sign-in";
	unsafeMetadata?: Record<string, unknown>;
};

type GoogleAuthButtonSignUp = {
	mode: "sign-up";
	unsafeMetadata?: Record<string, unknown>;
};

export function GoogleOAuthButton(
	props: GoogleAuthButtonSignIn | GoogleAuthButtonSignUp,
) {
	const clerk = useClerk();
	const { signIn } = useSignIn();
	const { signUp } = useSignUp();
	const [pending, setPending] = useState(false);

	const onClick = async () => {
		if (!clerk.loaded) return;

		await Promise.allSettled([signIn?.reset(), signUp?.reset()]);

		if (props.mode === "sign-in") {
			const metadata = props.unsafeMetadata;

			// Try sign-up first so new Google users get a signUp object (not signIn transfer).
			if (!signUp) return;
			setPending(true);
			const { error } = await signUp.sso({
				strategy: "oauth_google",
				redirectCallbackUrl: ROUTES.ssoCallback,
				redirectUrl: ROUTES.dashboard,
				unsafeMetadata: metadata,
			});
			setPending(false);

			if (error) {
				const code =
					"code" in error && typeof error.code === "string" ? error.code : "";
				if (
					code === "form_identifier_exists" ||
					code === "identifier_already_signed_up"
				) {
					if (!signIn) return;
					setPending(true);
					const { error: signInErr } = await signIn.sso({
						strategy: "oauth_google",
						redirectCallbackUrl: ROUTES.ssoCallback,
						redirectUrl: ROUTES.dashboard,
					});
					setPending(false);
					if (signInErr) {
						console.error(signInErr);
					}
					return;
				}
				console.error(error);
			}
			return;
		}

		if (!signUp) return;
		setPending(true);
		const { error } = await signUp.sso({
			strategy: "oauth_google",
			redirectCallbackUrl: ROUTES.ssoCallback,
			redirectUrl: ROUTES.dashboard,
			unsafeMetadata: props.unsafeMetadata,
		});
		setPending(false);
		if (error) {
			console.error(error);
		}
	};

	const needsSignUp = props.mode === "sign-up" || props.mode === "sign-in";
	const disabled =
		!clerk.loaded ||
		pending ||
		(needsSignUp && !signUp) ||
		(!signIn && props.mode === "sign-in");

	return (
		<Button
			type="button"
			variant="outline"
			disabled={disabled}
			onClick={() => void onClick()}
			className="h-12 w-full gap-2 rounded-full border-border bg-popover px-4 font-medium text-base text-foreground shadow-sm hover:bg-accent hover:text-accent-foreground sm:text-base"
		>
			<GoogleGlyph />
			{pending ? "Connecting…" : "Continue with Google"}
		</Button>
	);
}

function GoogleGlyph() {
	return (
		<img
			src={imageAssets.googleLogo}
			alt=""
			aria-hidden
			className="h-8 w-8 shrink-0 rounded-full bg-background object-contain p-1 ring-1 ring-border"
		/>
	);
}
