import { useClerk } from "@clerk/react";
import { api } from "@legacy-building/backend/convex/_generated/api";
import { firstClerkErrorMessage } from "@legacy-building/ui/lib/clerk-errors";
import { cn } from "@legacy-building/ui/lib/utils";
import { useAction, useQuery } from "convex/react";
import { ExternalLink, Loader2 } from "lucide-react";
import { useState } from "react";
import { accountInputClass } from "@/components/account/accountFormStyles";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogTitle,
} from "@/components/journal/ui/alert-dialog";
import { Input } from "@/components/journal/ui/input";
import {
	messageFromUnknownError,
	toastMutationError,
	toastMutationSuccess,
} from "@/lib/journal/toast";
import { ROUTES } from "@/lib/routes";

const CONFIRM_TEXT = "DELETE";

const STORE_INFO = {
	apple: {
		name: "the App Store",
		url: "https://apps.apple.com/account/subscriptions",
	},
	google: {
		name: "Google Play",
		url: "https://play.google.com/store/account/subscriptions",
	},
} as const;

type DeleteAccountDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

export function DeleteAccountDialog({
	open,
	onOpenChange,
}: DeleteAccountDialogProps) {
	const { signOut } = useClerk();
	const deleteMyAccount = useAction(api.user.deleteAccount.deleteMyAccount);
	const entitlement = useQuery(api.subscriptions.queries.getEntitlement);
	const [confirmInput, setConfirmInput] = useState("");
	const [deleting, setDeleting] = useState(false);

	// Apple/Google subscriptions can only be canceled in their store, so block
	// deletion until the user does (the server enforces this too).
	const storeProvider =
		entitlement?.provider === "apple" || entitlement?.provider === "google"
			? entitlement.provider
			: null;

	const canConfirm = confirmInput.trim() === CONFIRM_TEXT;

	const resetAndClose = () => {
		setConfirmInput("");
		onOpenChange(false);
	};

	const handleDelete = async () => {
		if (!canConfirm) return;
		setDeleting(true);
		try {
			await deleteMyAccount({});
			resetAndClose();
			toastMutationSuccess("Your account has been deleted.");
			await signOut({
				redirectUrl: `${window.location.origin}${ROUTES.login}`,
			});
		} catch (err) {
			const clerkMsg = firstClerkErrorMessage(err);
			toastMutationError(
				err,
				clerkMsg ??
					messageFromUnknownError(
						err,
						"Could not delete account. Please try again.",
					),
			);
		} finally {
			setDeleting(false);
		}
	};

	return (
		<AlertDialog
			open={open}
			onOpenChange={(next) => {
				if (!deleting) {
					if (!next) setConfirmInput("");
					onOpenChange(next);
				}
			}}
		>
			<AlertDialogContent
				overlayClassName="z-[2100] bg-[rgba(82,82,82,0.6)]"
				className={cn(
					"fixed top-1/2 right-0 left-0 z-[2101] mx-auto flex w-[calc(100%-32px)] max-w-[440px] flex-col gap-4",
					"!translate-x-0 -translate-y-1/2 rounded-[20px] border-0 bg-white p-5 shadow-lg",
				)}
			>
				{storeProvider ? (
					<>
						<AlertDialogTitle className="font-semibold text-[#b0200c] text-lg">
							Cancel your subscription first
						</AlertDialogTitle>
						<AlertDialogDescription className="text-[#525252] text-sm leading-[1.5]">
							You have an active subscription through{" "}
							{STORE_INFO[storeProvider].name}. To delete your account, cancel
							it in {STORE_INFO[storeProvider].name} first, then come back and
							try again — we can't cancel store subscriptions for you.
						</AlertDialogDescription>
						<a
							href={STORE_INFO[storeProvider].url}
							target="_blank"
							rel="noopener noreferrer"
							className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-[#f2f2f2] px-4 font-medium text-[#1a1a1a] text-sm transition-opacity hover:opacity-90"
						>
							<ExternalLink className="size-4" aria-hidden />
							Manage in {STORE_INFO[storeProvider].name}
						</a>
						<AlertDialogFooter className="mt-2">
							<AlertDialogCancel className="min-h-11 flex-1 rounded-xl bg-[#f2f2f2] px-4 text-[#525252] leading-[1.4] hover:opacity-90">
								Close
							</AlertDialogCancel>
						</AlertDialogFooter>
					</>
				) : (
					<>
						<AlertDialogTitle className="font-semibold text-[#b0200c] text-lg">
							Delete account permanently?
						</AlertDialogTitle>
						<AlertDialogDescription className="text-[#525252] text-sm leading-[1.5]">
							This cannot be undone. Your subscription will be cancelled
							immediately, and your account, journals, entries, and uploaded
							media will be permanently removed. You will be signed out and
							returned to the login page.
						</AlertDialogDescription>
						<div className="flex flex-col gap-2">
							<label
								htmlFor="delete-account-confirm"
								className="font-medium text-[#1a1a1a] text-sm"
							>
								Type <span className="font-semibold">{CONFIRM_TEXT}</span> to
								confirm
							</label>
							<Input
								id="delete-account-confirm"
								value={confirmInput}
								onChange={(e) => setConfirmInput(e.target.value)}
								placeholder={CONFIRM_TEXT}
								disabled={deleting}
								autoComplete="off"
								className={accountInputClass}
							/>
						</div>
						<AlertDialogFooter className="mt-2 flex flex-row flex-nowrap items-stretch gap-3 sm:flex-row sm:justify-stretch">
							<AlertDialogCancel
								disabled={deleting}
								className="min-h-11 flex-1 rounded-xl bg-[#f2f2f2] px-4 text-[#525252] leading-[1.4] hover:opacity-90"
							>
								Cancel
							</AlertDialogCancel>
							<AlertDialogAction
								onClick={(e) => {
									e.preventDefault();
									void handleDelete();
								}}
								disabled={deleting || !canConfirm}
								className="min-h-11 flex-1 rounded-xl bg-[#b0200c] px-4 text-white leading-[1.4] hover:bg-[#9a1c0a] disabled:opacity-50"
							>
								{deleting ? (
									<>
										<Loader2 className="size-4 animate-spin" aria-hidden />
										Deleting…
									</>
								) : (
									"Delete account"
								)}
							</AlertDialogAction>
						</AlertDialogFooter>
					</>
				)}
			</AlertDialogContent>
		</AlertDialog>
	);
}
