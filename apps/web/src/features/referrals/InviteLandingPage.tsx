import { brand } from "@legacy-building/ui/lib/brand-journal";
import { Check, Copy, Smartphone } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/journal/ui/button";
import {
	ANDROID_IS_PUBLIC,
	APP_STORE_URL,
	PLAY_STORE_URL,
	type VisitorPlatform,
} from "@/lib/referrals/storeLinks";

type InviteLandingPageProps = {
	code: string;
	inviterFirstName: string | null;
	platform: VisitorPlatform;
	onContinueOnWeb: () => void;
};

/**
 * Shown to phone visitors who followed an invite link.
 *
 * The code is displayed prominently on purpose: someone who installs from the
 * store arrives in a brand-new app that has no memory of the link they tapped,
 * so this screen is the only place they can learn the code they'll be asked for
 * during onboarding.
 */
export function InviteLandingPage({
	code,
	inviterFirstName,
	platform,
	onContinueOnWeb,
}: InviteLandingPageProps) {
	const [copied, setCopied] = useState(false);

	async function copyCode() {
		try {
			await navigator.clipboard.writeText(code);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch {
			// Clipboard blocked — the code is on screen to read anyway.
		}
	}

	const storeUrl = platform === "android" ? PLAY_STORE_URL : APP_STORE_URL;
	const storeLabel =
		platform === "android"
			? ANDROID_IS_PUBLIC
				? "Get it on Google Play"
				: "Join the Android test"
			: "Download on the App Store";

	return (
		<main
			className="flex min-h-svh w-full flex-col items-center justify-center px-5 py-10"
			style={{ backgroundColor: brand.pageBackground }}
		>
			<div className="flex w-full max-w-[420px] flex-col items-center gap-6 rounded-[20px] bg-white p-7 shadow-sm">
				<div
					className="flex size-14 items-center justify-center rounded-full"
					style={{ backgroundColor: brand.libraryMint }}
				>
					<Smartphone className="size-7" style={{ color: brand.primary }} />
				</div>

				<div className="flex flex-col items-center gap-1.5 text-center">
					<h1 className="font-semibold text-2xl text-[#1a1a1a] leading-tight">
						{inviterFirstName
							? `${inviterFirstName} invited you`
							: "You've been invited"}
					</h1>
					<p className="text-[#8a8a8a] text-sm leading-[1.5]">
						Legacy Building helps you preserve your family's stories before
						they're lost.
					</p>
				</div>

				<div className="flex w-full flex-col items-center gap-2">
					<span className="font-medium text-[#8a8a8a] text-xs uppercase tracking-wider">
						Your invite code
					</span>
					<button
						type="button"
						onClick={() => void copyCode()}
						aria-label={`Copy invite code ${code}`}
						className="flex w-full items-center justify-center gap-3 rounded-[12px] border border-dashed py-4 transition-colors hover:bg-[#f7f7f7] active:scale-[0.99]"
						style={{ borderColor: brand.primary }}
					>
						<span
							className="font-bold text-2xl tracking-[0.2em]"
							style={{ color: brand.primary }}
						>
							{code}
						</span>
						{copied ? (
							<Check className="size-5" style={{ color: brand.primary }} />
						) : (
							<Copy className="size-5" style={{ color: brand.textMuted }} />
						)}
					</button>
					<p className="text-center text-[#8a8a8a] text-xs leading-[1.5]">
						You'll be asked for this when you first open the app.
					</p>
				</div>

				<div className="flex w-full flex-col gap-2.5">
					<a
						href={storeUrl}
						target="_blank"
						rel="noreferrer"
						className="flex h-12 w-full items-center justify-center rounded-full font-semibold text-sm text-white transition-opacity hover:opacity-95 active:scale-[0.98]"
						style={{ backgroundColor: brand.primary }}
					>
						{storeLabel}
					</a>
					<Button
						type="button"
						variant="outline"
						onClick={onContinueOnWeb}
						className="h-12 w-full rounded-full font-semibold text-sm transition-colors active:scale-[0.98]"
					>
						Continue on web
					</Button>
				</div>

				{platform === "android" && !ANDROID_IS_PUBLIC ? (
					<p className="text-center text-[#8a8a8a] text-xs leading-[1.5]">
						Android is in testing — join the test first, then install from
						Google Play.
					</p>
				) : null}
			</div>
		</main>
	);
}
