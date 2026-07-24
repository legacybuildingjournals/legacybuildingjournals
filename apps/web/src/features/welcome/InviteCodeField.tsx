import { api } from "@legacy-building/backend/convex/_generated/api";
import { isValidInviteCodeFormat } from "@legacy-building/backend/convex/referrals/codes";
import { useMutation } from "convex/react";
import { Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/journal/ui/button";
import { Input } from "@/components/journal/ui/input";
import {
	clearPendingInviteCode,
	readPendingInviteCode,
} from "@/lib/referrals/inviteCodeStorage";

type Status =
	| { kind: "idle" }
	| { kind: "claimed"; inviter: string | null }
	| { kind: "error"; message: string };

/**
 * Optional invite entry on the welcome screen.
 *
 * A code captured from `/invite/:code` is claimed silently on mount, so most
 * users never see an input. The field only appears when nothing was captured —
 * which is the in-app-browser case, where storage didn't survive the hop to
 * another browser.
 */
export function InviteCodeField() {
	const claimInvite = useMutation(api.referrals.mutations.claimInvite);
	const [code, setCode] = useState("");
	const [status, setStatus] = useState<Status>({ kind: "idle" });
	const [submitting, setSubmitting] = useState(false);
	const autoClaimed = useRef(false);

	async function claim(raw: string, silent: boolean) {
		const trimmed = raw.trim();
		if (!trimmed) return;

		setSubmitting(true);
		try {
			const result = await claimInvite({ code: trimmed, via: "web" });
			if (result.status === "claimed") {
				clearPendingInviteCode();
				setStatus({ kind: "claimed", inviter: result.inviterFirstName });
				return;
			}
			// A stale stored code shouldn't nag someone who never typed anything.
			if (silent) {
				clearPendingInviteCode();
				return;
			}
			setStatus({
				kind: "error",
				message:
					result.status === "own_code"
						? "You can't use your own invite code."
						: result.status === "already_invited"
							? "An invite is already applied to your account."
							: "That invite code wasn't found.",
			});
		} catch {
			if (!silent) {
				setStatus({
					kind: "error",
					message: "Could not check that code. Please try again.",
				});
			}
		} finally {
			setSubmitting(false);
		}
	}

	// Claim whatever the invite link left behind, once.
	// biome-ignore lint/correctness/useExhaustiveDependencies: mount-only; the ref guards re-entry
	useEffect(() => {
		if (autoClaimed.current) return;
		autoClaimed.current = true;

		const pending = readPendingInviteCode();
		if (pending) void claim(pending, true);
	}, []);

	if (status.kind === "claimed") {
		return (
			<p className="flex items-center gap-1.5 text-sm text-white/90">
				<Check className="size-4" strokeWidth={3} />
				{status.inviter
					? `You're joining through ${status.inviter}.`
					: "Invite applied."}
			</p>
		);
	}

	return (
		<div className="flex w-full max-w-[420px] flex-col items-center gap-2">
			<div className="flex w-full gap-2">
				<Input
					value={code}
					onChange={(event) => {
						setStatus({ kind: "idle" });
						setCode(event.target.value.toUpperCase());
					}}
					placeholder="Invite code (optional)"
					aria-label="Invite code"
					aria-invalid={status.kind === "error"}
					spellCheck={false}
					className="h-11 bg-white/95 text-center"
				/>
				<Button
					type="button"
					onClick={() => void claim(code, false)}
					disabled={!isValidInviteCodeFormat(code) || submitting}
					className="h-11 rounded-md px-5 transition-colors active:scale-[0.98]"
				>
					{submitting ? "Checking…" : "Apply"}
				</Button>
			</div>
			{status.kind === "error" ? (
				<p className="text-sm text-white/90" role="alert">
					{status.message}
				</p>
			) : null}
		</div>
	);
}
