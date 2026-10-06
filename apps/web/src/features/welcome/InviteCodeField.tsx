import { api } from "@legacy-building/backend/convex/_generated/api";
import { useMutation } from "convex/react";
import { Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import {
	clearPendingInviteCode,
	readPendingInviteCode,
} from "@/lib/referrals/inviteCodeStorage";

/**
 * Claims the invite code left behind by `/invite/:code`, silently, on mount.
 *
 * The manual "enter a code" input this component used to render is hidden for
 * now (it only ever mattered in the in-app-browser case, where storage didn't
 * survive the hop to another browser). Invite *links* still work end to end —
 * only the typed-code fallback is gone. Restore it from git history if the
 * manual path is wanted back.
 */
export function InviteCodeField() {
	const claimInvite = useMutation(api.referrals.mutations.claimInvite);
	const [inviter, setInviter] = useState<string | null>(null);
	const [claimed, setClaimed] = useState(false);
	const autoClaimed = useRef(false);

	// Claim whatever the invite link left behind, once.
	// biome-ignore lint/correctness/useExhaustiveDependencies: mount-only; the ref guards re-entry
	useEffect(() => {
		if (autoClaimed.current) return;
		autoClaimed.current = true;

		const pending = readPendingInviteCode();
		if (!pending) return;

		void claimInvite({ code: pending, via: "web" })
			.then((result) => {
				// A stale stored code shouldn't nag someone who never typed anything,
				// so every non-success outcome just clears it and stays quiet.
				clearPendingInviteCode();
				if (result.status === "claimed") {
					setInviter(result.inviterFirstName);
					setClaimed(true);
				}
			})
			.catch(() => {
				// An invite is a bonus, never a blocker — carry on regardless.
			});
	}, []);

	if (!claimed) return null;

	return (
		<p className="flex items-center gap-1.5 text-sm text-white/90">
			<Check className="size-4" strokeWidth={3} />
			{inviter ? `You're joining through ${inviter}.` : "Invite applied."}
		</p>
	);
}
