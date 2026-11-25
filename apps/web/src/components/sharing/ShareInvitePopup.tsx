import { api } from "@legacy-building/backend/convex/_generated/api";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import {
	BookOpen,
	Loader2,
	NotebookPen,
	PencilLine,
	UserRound,
	Users,
} from "lucide-react";
import { type ReactNode, useState } from "react";

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/journal/ui/dialog";
import { toastMutationError, toastMutationSuccess } from "@/lib/journal/toast";
import { ROUTES } from "@/lib/routes";

function Row({
	icon,
	label,
	value,
}: {
	icon: ReactNode;
	label: string;
	value: string;
}) {
	return (
		<div className="flex items-center gap-3 border-border border-b py-2.5 last:border-b-0">
			<span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
				{icon}
			</span>
			<div className="min-w-0">
				<p className="text-muted-foreground text-xs">{label}</p>
				<p className="truncate font-medium text-foreground">{value}</p>
			</div>
		</div>
	);
}

/**
 * Figma "Share Journal Invite" popup for people who already have an account
 * (they get no email, spec #8/#10). Accept only, no decline (spec #11); it
 * can be closed and comes back next time the app opens.
 */
export function ShareInvitePopup() {
	const invites = useQuery(api.sharing.queries.myPendingInvites);
	const acceptInvite = useMutation(api.sharing.mutations.acceptInvite);
	const navigate = useNavigate();
	const [dismissed, setDismissed] = useState<Set<string>>(new Set());
	const [accepting, setAccepting] = useState(false);

	const invite = invites?.find((item) => !dismissed.has(item.token));
	if (!invite) return null;

	const handleAccept = async () => {
		setAccepting(true);
		try {
			const { journalId } = await acceptInvite({ token: invite.token });
			toastMutationSuccess(`You joined "${invite.journalTitle}".`);
			await navigate({
				to: ROUTES.dashboardLibrary,
				state: { storyTab: "our_story", journalId },
			});
		} catch (err) {
			toastMutationError(err, "Could not accept the invite. Please try again.");
		} finally {
			setAccepting(false);
		}
	};

	return (
		<Dialog
			open
			onOpenChange={(open) => {
				if (!open) setDismissed((prev) => new Set(prev).add(invite.token));
			}}
		>
			<DialogContent className="max-w-sm rounded-2xl sm:max-w-sm">
				<DialogHeader className="items-center text-center">
					<span className="mb-1 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
						<Users className="size-6" aria-hidden />
					</span>
					<DialogTitle className="font-serif text-2xl text-primary italic">
						You&apos;re Invited
					</DialogTitle>
					<DialogDescription className="sr-only">
						{invite.authorName} invited you to share the journal{" "}
						{invite.journalTitle}.
					</DialogDescription>
				</DialogHeader>
				<div className="rounded-2xl border border-border px-3">
					<Row
						icon={<UserRound className="size-4" aria-hidden />}
						label="Invited by"
						value={invite.authorName}
					/>
					<Row
						icon={<BookOpen className="size-4" aria-hidden />}
						label="Journal"
						value={invite.journalTitle}
					/>
				</div>
				<div>
					<p className="mb-2 font-medium text-foreground text-sm">
						In a shared journal, you can
					</p>
					<ul className="flex flex-col gap-2 text-foreground text-sm">
						<li className="flex items-center gap-2">
							<PencilLine className="size-4 text-primary" aria-hidden />
							Add your own journal entries
						</li>
						<li className="flex items-center gap-2">
							<NotebookPen className="size-4 text-primary" aria-hidden />
							View all shared entries
						</li>
						<li className="flex items-center gap-2">
							<Users className="size-4 text-primary" aria-hidden />
							Contribute together to build memories
						</li>
					</ul>
				</div>
				<button
					type="button"
					onClick={() => void handleAccept()}
					disabled={accepting}
					className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary font-semibold text-primary-foreground text-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-[0.98] disabled:opacity-60"
				>
					{accepting ? (
						<>
							<Loader2 className="size-4 animate-spin" aria-hidden />
							Accepting…
						</>
					) : (
						"Accept Invite"
					)}
				</button>
			</DialogContent>
		</Dialog>
	);
}
