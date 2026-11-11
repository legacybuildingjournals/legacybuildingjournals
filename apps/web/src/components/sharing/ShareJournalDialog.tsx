import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "@legacy-building/backend/convex/_generated/api";
import type { Id } from "@legacy-building/backend/convex/_generated/dataModel";
import { useAction } from "convex/react";
import { Info, Loader2, UserRound } from "lucide-react";
import { useForm } from "react-hook-form";

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/journal/ui/dialog";
import { Input } from "@/components/journal/ui/input";
import {
	messageFromUnknownError,
	toastMutationSuccess,
} from "@/lib/journal/toast";
import {
	type ShareInviteValues,
	shareInviteSchema,
} from "@/lib/sharing/schemas";

/**
 * Figma "Share Journal": invite one loved one by email. People who already
 * have an account see the invite in the app; others get an email.
 */
export function ShareJournalDialog({
	journalId,
	open,
	onOpenChange,
}: {
	journalId: Id<"journals"> | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const sendInvite = useAction(api.sharing.actions.sendInvite);
	const form = useForm<ShareInviteValues>({
		resolver: zodResolver(shareInviteSchema),
		defaultValues: { email: "" },
	});
	const { errors, isSubmitting } = form.formState;

	const onSubmit = form.handleSubmit(async ({ email }) => {
		if (!journalId) return;
		form.clearErrors("root");
		try {
			const result = await sendInvite({ journalId, email });
			toastMutationSuccess(
				result.hasAccount
					? "Invite sent. They'll see it next time they open Legacy Building."
					: "Invite sent by email.",
			);
			form.reset();
			onOpenChange(false);
		} catch (err) {
			form.setError("root", {
				message: messageFromUnknownError(
					err,
					"Could not send the invite. Please try again.",
				),
			});
		}
	});

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				if (!next) form.reset();
				onOpenChange(next);
			}}
		>
			<DialogContent className="max-w-md rounded-2xl sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Share Journal</DialogTitle>
					<DialogDescription className="sr-only">
						Invite a loved one to this journal by email.
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
					<div className="flex flex-col gap-4 rounded-2xl border border-border p-4">
						<div className="flex items-start gap-3">
							<span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
								<UserRound className="size-4" aria-hidden />
							</span>
							<div>
								<p className="font-semibold text-foreground text-sm">
									Invite a Loved One
								</p>
								<p className="text-muted-foreground text-xs">
									Invite someone to contribute to this journal. They&apos;ll use
									their own account.
								</p>
							</div>
						</div>
						<div className="flex flex-col gap-1.5">
							<label
								htmlFor="share-email"
								className="font-medium text-foreground text-sm"
							>
								Email Address
							</label>
							<Input
								id="share-email"
								type="email"
								placeholder="Enter email address"
								autoComplete="off"
								{...form.register("email")}
								aria-invalid={Boolean(errors.email)}
								aria-describedby="share-email-error"
								className="h-11 rounded-xl"
							/>
							{errors.email?.message ? (
								<p id="share-email-error" className="text-destructive text-xs">
									{errors.email.message}
								</p>
							) : null}
						</div>
						<div className="flex items-start gap-3 rounded-xl bg-primary/10 p-3">
							<Info
								className="mt-0.5 size-4 shrink-0 text-primary"
								aria-hidden
							/>
							<div>
								<p className="font-semibold text-foreground text-xs">
									What they&apos;ll have access to
								</p>
								<p className="text-muted-foreground text-xs leading-relaxed">
									The invited member will be able to view and add entries to
									this journal. Your other journals will remain private.
								</p>
							</div>
						</div>
					</div>
					{errors.root?.message ? (
						<p className="text-center text-destructive text-sm" role="alert">
							{errors.root.message}
						</p>
					) : null}
					<button
						type="submit"
						disabled={isSubmitting}
						className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary font-semibold text-primary-foreground text-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-[0.98] disabled:opacity-60"
					>
						{isSubmitting ? (
							<>
								<Loader2 className="size-4 animate-spin" aria-hidden />
								Sending…
							</>
						) : (
							"Send Share Invite"
						)}
					</button>
				</form>
			</DialogContent>
		</Dialog>
	);
}
