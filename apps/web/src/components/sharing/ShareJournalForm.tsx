import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "@legacy-building/backend/convex/_generated/api";
import type { Id } from "@legacy-building/backend/convex/_generated/dataModel";
import { cn } from "@legacy-building/ui/lib/utils";
import { useAction } from "convex/react";
import { Loader2, Send, UserPlus } from "lucide-react";
import { useForm } from "react-hook-form";

import { giftPrimaryButtonClass } from "@/components/gift/GiftPageChrome";
import { Input } from "@/components/journal/ui/input";
import {
	messageFromUnknownError,
	toastMutationSuccess,
} from "@/lib/journal/toast";
import {
	SHARE_RECIPIENT_NAME_MAX,
	type ShareInviteValues,
	shareInviteSchema,
} from "@/lib/sharing/schemas";

const labelClass = "font-semibold text-foreground text-sm";
const fieldClass = "h-12 rounded-xl border-border bg-background px-4 text-sm";

function FieldError({ id, message }: { id: string; message?: string }) {
	if (!message) return null;
	return (
		<p id={id} className="text-destructive text-xs">
			{message}
		</p>
	);
}

/**
 * Figma "Share Journal" → "Invite a Member" card: the recipient's name and
 * email. People who already have an account see the invite in the app;
 * others get an email greeting them by name.
 */
export function ShareJournalForm({
	journalId,
	onSent,
	className,
}: {
	journalId: Id<"journals">;
	onSent: () => void;
	className?: string;
}) {
	const sendInvite = useAction(api.sharing.actions.sendInvite);
	const form = useForm<ShareInviteValues>({
		resolver: zodResolver(shareInviteSchema),
		defaultValues: { recipientName: "", email: "" },
	});
	const { errors, isSubmitting } = form.formState;

	const onSubmit = form.handleSubmit(async ({ recipientName, email }) => {
		form.clearErrors("root");
		try {
			const result = await sendInvite({ journalId, email, recipientName });
			toastMutationSuccess(
				result.hasAccount
					? "Invite sent. They'll see it next time they open Legacy Building."
					: "Invite sent by email.",
			);
			onSent();
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
		<form
			onSubmit={onSubmit}
			noValidate
			className={cn(
				"flex flex-col rounded-2xl border border-border bg-card p-5 shadow-sm md:p-7",
				className,
			)}
		>
			<div className="flex flex-col gap-1">
				<h2 className="font-semibold text-2xl text-foreground">
					Invite a Member
				</h2>
				<p className="text-muted-foreground text-sm">
					Enter the recipient&apos;s details to share this journal.
				</p>
			</div>

			<div className="mt-6 flex flex-col gap-5">
				<div className="flex flex-col gap-1.5">
					<label htmlFor="share-name" className={labelClass}>
						Recipient&apos;s Name
					</label>
					<Input
						id="share-name"
						placeholder="Enter full name"
						autoComplete="off"
						maxLength={SHARE_RECIPIENT_NAME_MAX}
						{...form.register("recipientName")}
						aria-invalid={Boolean(errors.recipientName)}
						aria-describedby="share-name-error"
						className={fieldClass}
					/>
					<FieldError
						id="share-name-error"
						message={errors.recipientName?.message}
					/>
				</div>
				<div className="flex flex-col gap-1.5">
					<label htmlFor="share-email" className={labelClass}>
						Recipient&apos;s Email
					</label>
					<Input
						id="share-email"
						type="email"
						placeholder="Enter email address"
						autoComplete="off"
						{...form.register("email")}
						aria-invalid={Boolean(errors.email)}
						aria-describedby="share-email-error"
						className={fieldClass}
					/>
					<FieldError id="share-email-error" message={errors.email?.message} />
				</div>

				<div className="flex items-start gap-3 rounded-2xl bg-primary/10 p-4">
					<span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-background text-primary">
						<Send className="size-4" aria-hidden />
					</span>
					<div className="flex flex-col gap-0.5">
						<p className="font-semibold text-foreground text-sm">
							What they&apos;ll have access to?
						</p>
						<p className="text-muted-foreground text-xs leading-relaxed md:text-sm">
							The invited member can create entries in the shared journal and
							will have access to other permitted journal entries.
						</p>
					</div>
				</div>
			</div>

			{/* mt-auto: the card is stretched to the artwork card's height on
			    desktop, so the button sits at the bottom. */}
			<div className="mt-auto flex flex-col gap-3 pt-6">
				{errors.root?.message ? (
					<p className="text-center text-destructive text-sm" role="alert">
						{errors.root.message}
					</p>
				) : null}
				<button
					type="submit"
					disabled={isSubmitting}
					className={giftPrimaryButtonClass}
				>
					{isSubmitting ? (
						<>
							<Loader2 className="size-4 animate-spin" aria-hidden />
							Sending…
						</>
					) : (
						<>
							<UserPlus className="size-4" aria-hidden />
							Send Invite
						</>
					)}
				</button>
			</div>
		</form>
	);
}
