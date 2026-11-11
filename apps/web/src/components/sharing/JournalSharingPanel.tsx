import { api } from "@legacy-building/backend/convex/_generated/api";
import type { Id } from "@legacy-building/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { Loader2, UserPlus } from "lucide-react";
import { useState } from "react";

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/journal/ui/alert-dialog";
import { toastMutationError, toastMutationSuccess } from "@/lib/journal/toast";

type Person = { name: string; initials: string; isYou: boolean };

function PersonChip({
	person,
	roleLabel,
}: {
	person: Person;
	roleLabel: string;
}) {
	return (
		<div className="flex items-center gap-2">
			<span
				className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary text-xs"
				aria-hidden
			>
				{person.initials}
			</span>
			<div className="min-w-0">
				<p className="truncate font-medium text-foreground text-sm">
					{person.isYou ? "You" : person.name}
				</p>
				<p className="text-muted-foreground text-xs">{roleLabel}</p>
			</div>
		</div>
	);
}

type ConfirmKind = "remove" | "leave" | "cancel";

const CONFIRM_COPY: Record<
	ConfirmKind,
	{ title: string; body: string; action: string }
> = {
	remove: {
		title: "Remove member?",
		body: "They'll lose access to this journal, and the entries they added will be deleted.",
		action: "Remove member",
	},
	leave: {
		title: "Leave this journal?",
		body: "You'll lose access to it, and the entries you added will be deleted.",
		action: "Leave journal",
	},
	cancel: {
		title: "Cancel invite?",
		body: "The invite link will stop working. You can invite someone again later.",
		action: "Cancel invite",
	},
};

/**
 * Sharing block in the journal sheet: "Shared Journal" pill, author/member
 * people row (initials, as designed), pending invite, and the share / remove
 * / cancel / leave actions for whoever is allowed to use them.
 */
export function JournalSharingPanel({
	journalId,
	onShare,
	onLeft,
}: {
	journalId: Id<"journals">;
	onShare: () => void;
	onLeft: () => void;
}) {
	const sharing = useQuery(api.sharing.queries.getForJournal, { journalId });
	const removeMember = useMutation(api.sharing.mutations.removeMember);
	const leaveJournal = useMutation(api.sharing.mutations.leaveJournal);
	const cancelInvite = useMutation(api.sharing.mutations.cancelInvite);
	const [confirm, setConfirm] = useState<ConfirmKind | null>(null);
	const [busy, setBusy] = useState(false);

	if (!sharing) return null;
	const isAuthor = sharing.viewerRole === "author";
	const isShared = sharing.member !== null;

	const runConfirmed = async () => {
		if (!confirm) return;
		setBusy(true);
		try {
			if (confirm === "remove") {
				await removeMember({ journalId });
				toastMutationSuccess("Member removed.");
			} else if (confirm === "cancel") {
				await cancelInvite({ journalId });
				toastMutationSuccess("Invite cancelled.");
			} else {
				await leaveJournal({ journalId });
				toastMutationSuccess("You left the journal.");
				onLeft();
			}
			setConfirm(null);
		} catch (err) {
			toastMutationError(err, "Something went wrong. Please try again.");
		} finally {
			setBusy(false);
		}
	};

	return (
		<div className="mt-3 flex flex-col gap-3 px-3">
			{isShared ? (
				<span className="w-fit rounded-full bg-green-50 px-2.5 py-0.5 font-medium text-green-800 text-xs">
					Shared Journal
				</span>
			) : null}
			{isShared ? (
				<div className="flex flex-wrap items-center gap-x-6 gap-y-2">
					<PersonChip person={sharing.author} roleLabel="Author" />
					{sharing.member ? (
						<PersonChip person={sharing.member} roleLabel="Member" />
					) : null}
				</div>
			) : null}
			{isAuthor && sharing.pendingInvite ? (
				<p className="text-muted-foreground text-xs">
					Invite pending for{" "}
					<span className="font-medium text-foreground">
						{sharing.pendingInvite.email}
					</span>
				</p>
			) : null}
			{isShared && !sharing.canAddEntries ? (
				<p className="rounded-xl bg-amber-50 p-2 text-amber-900 text-xs">
					New entries are paused until the journal&apos;s author has an active
					subscription.
				</p>
			) : null}
			<div className="flex flex-wrap gap-2">
				{isAuthor && !isShared && !sharing.pendingInvite ? (
					<button
						type="button"
						onClick={onShare}
						className="inline-flex h-9 items-center gap-2 rounded-full border border-primary px-4 font-medium text-primary text-sm transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-[0.98]"
					>
						<UserPlus className="size-4" aria-hidden />
						Share Journal
					</button>
				) : null}
				{isAuthor && sharing.pendingInvite ? (
					<button
						type="button"
						onClick={() => setConfirm("cancel")}
						className="h-9 rounded-full border border-border px-4 text-muted-foreground text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-[0.98]"
					>
						Cancel invite
					</button>
				) : null}
				{isAuthor && isShared ? (
					<button
						type="button"
						onClick={() => setConfirm("remove")}
						className="h-9 rounded-full border border-destructive/40 px-4 text-destructive text-sm transition-colors hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive active:scale-[0.98]"
					>
						Remove member
					</button>
				) : null}
				{!isAuthor ? (
					<button
						type="button"
						onClick={() => setConfirm("leave")}
						className="h-9 rounded-full border border-destructive/40 px-4 text-destructive text-sm transition-colors hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive active:scale-[0.98]"
					>
						Leave journal
					</button>
				) : null}
			</div>

			<AlertDialog
				open={confirm !== null}
				onOpenChange={(next) => (next ? null : setConfirm(null))}
			>
				<AlertDialogContent>
					{confirm ? (
						<>
							<AlertDialogHeader>
								<AlertDialogTitle>
									{CONFIRM_COPY[confirm].title}
								</AlertDialogTitle>
								<AlertDialogDescription>
									{CONFIRM_COPY[confirm].body}
								</AlertDialogDescription>
							</AlertDialogHeader>
							<AlertDialogFooter>
								<AlertDialogCancel disabled={busy}>Keep</AlertDialogCancel>
								<AlertDialogAction
									disabled={busy}
									onClick={(event) => {
										event.preventDefault();
										void runConfirmed();
									}}
								>
									{busy ? (
										<Loader2 className="size-4 animate-spin" aria-hidden />
									) : (
										CONFIRM_COPY[confirm].action
									)}
								</AlertDialogAction>
							</AlertDialogFooter>
						</>
					) : null}
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
