import { api } from "@legacy-building/backend/convex/_generated/api";
import type { Id } from "@legacy-building/backend/convex/_generated/dataModel";
import { Button } from "@legacy-building/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@legacy-building/ui/components/dialog";
import { Skeleton } from "@legacy-building/ui/components/skeleton";
import { useMutation, useQuery } from "convex/react";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
	AccountStatusBadge,
	PaidAccessBadge,
	RoleBadge,
	SubscriptionStatusBadge,
} from "@/components/subscription-status-badge";
import {
	formatOnboardingDate,
	UserBillingSection,
} from "@/components/user-billing-section";
import {
	adminDestructiveButtonClass,
	adminDestructiveConfirmButtonClass,
	adminDialogContentClass,
	adminDialogOverlayClass,
	adminPrimaryButtonClass,
	adminPrimaryButtonSmClass,
} from "@/lib/admin-theme";

type UserDetailDialogProps = {
	userId: Id<"users"> | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

type ConfirmAction =
	| { type: "role"; role: "admin" | "user" }
	| { type: "status"; status: "active" | "suspended" }
	| { type: "beta"; betaAccess: boolean }
	| null;

function isDestructiveConfirmAction(action: ConfirmAction): boolean {
	if (!action) return false;
	if (action.type === "role") return action.role === "user";
	return action.status === "suspended";
}

function confirmButtonLabel(action: ConfirmAction, pending: boolean): string {
	if (pending) return "Confirming…";
	if (!action) return "Confirm";
	if (action.type === "role") {
		return action.role === "admin" ? "Make admin" : "Remove admin";
	}
	if (action.type === "beta") {
		return action.betaAccess ? "Grant beta" : "Remove beta";
	}
	return action.status === "suspended" ? "Suspend" : "Reactivate";
}

export function UserDetailDialog({
	userId,
	open,
	onOpenChange,
}: UserDetailDialogProps) {
	const user = useQuery(
		api.admin.queries.getUser,
		userId && open ? { userId } : "skip",
	);
	const setUserRole = useMutation(api.admin.mutations.setUserRole);
	const setAccountStatus = useMutation(api.admin.mutations.setAccountStatus);
	const setBetaAccess = useMutation(api.admin.mutations.setBetaAccess);

	const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
	const [pending, setPending] = useState(false);

	const closeConfirm = () => setConfirmAction(null);

	const runConfirmedAction = async () => {
		if (!userId || !confirmAction) return;
		setPending(true);
		try {
			if (confirmAction.type === "role") {
				await setUserRole({ userId, role: confirmAction.role });
				toast.success(
					confirmAction.role === "admin"
						? "User promoted to admin."
						: "Admin access removed.",
				);
			} else if (confirmAction.type === "beta") {
				await setBetaAccess({
					userId,
					betaAccess: confirmAction.betaAccess,
				});
				toast.success(
					confirmAction.betaAccess
						? "Beta access granted."
						: "Beta access removed.",
				);
			} else {
				await setAccountStatus({
					userId,
					accountStatus: confirmAction.status,
				});
				toast.success(
					confirmAction.status === "suspended"
						? "User suspended."
						: "User reactivated.",
				);
			}
			closeConfirm();
		} catch (err) {
			const message =
				err instanceof Error ? err.message : "Action failed. Try again.";
			toast.error(message);
		} finally {
			setPending(false);
		}
	};

	const confirmTitle =
		confirmAction?.type === "role"
			? confirmAction.role === "admin"
				? "Make admin?"
				: "Remove admin access?"
			: confirmAction?.type === "beta"
				? confirmAction.betaAccess
					? "Grant beta access?"
					: "Remove beta access?"
				: confirmAction?.status === "suspended"
					? "Suspend user?"
					: "Reactivate user?";

	const confirmDescription =
		confirmAction?.type === "role"
			? confirmAction.role === "admin"
				? "This user will be able to sign in to the admin panel."
				: "This user will lose admin panel access."
			: confirmAction?.type === "beta"
				? confirmAction.betaAccess
					? "This user will bypass the subscription paywall and can use all journal features for free."
					: "This user will lose free beta access and must subscribe to use journal features."
				: confirmAction?.status === "suspended"
					? "This user will be blocked from the web app until reactivated."
					: "This user will regain access to the web app.";

	return (
		<>
			<Dialog open={open} onOpenChange={onOpenChange}>
				<DialogContent
					overlayClassName={adminDialogOverlayClass}
					className={`flex max-w-2xl flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-2xl ${adminDialogContentClass}`}
				>
					<DialogHeader className="shrink-0 border-border border-b px-6 py-4">
						<DialogTitle className="font-heading text-popover-foreground">
							User account
						</DialogTitle>
						<DialogDescription>
							Manage role, account status, and review billing details.
						</DialogDescription>
					</DialogHeader>

					<div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
						{user === undefined ? (
							<div className="space-y-3">
								<Skeleton className="h-5 w-48 rounded-md" />
								<Skeleton className="h-4 w-full rounded-md" />
								<Skeleton className="h-4 w-3/4 rounded-md" />
							</div>
						) : user === null ? (
							<p className="text-muted-foreground text-sm">User not found.</p>
						) : (
							<div className="space-y-4">
								<div>
									<p className="font-medium text-popover-foreground">
										{user.name}
									</p>
									<p className="text-muted-foreground text-sm">{user.email}</p>
								</div>

								<dl className="grid gap-3 text-sm">
									<div className="flex items-center justify-between gap-4">
										<dt className="text-muted-foreground">Role</dt>
										<dd>
											<RoleBadge role={user.role} />
										</dd>
									</div>
									<div className="flex items-center justify-between gap-4">
										<dt className="text-muted-foreground">Account</dt>
										<dd>
											<AccountStatusBadge status={user.accountStatus} />
										</dd>
									</div>
									<div className="flex items-center justify-between gap-4">
										<dt className="text-muted-foreground">Subscription</dt>
										<dd>
											<SubscriptionStatusBadge
												status={user.subscriptionStatus}
												betaAccess={user.betaAccess}
											/>
										</dd>
									</div>
									<div className="flex items-center justify-between gap-4">
										<dt className="text-muted-foreground">Journal access</dt>
										<dd>
											<PaidAccessBadge
												hasAccess={user.billing.hasPaidFeatureAccess}
											/>
										</dd>
									</div>
									<div className="flex items-center justify-between gap-4">
										<dt className="text-muted-foreground">Welcome completed</dt>
										<dd className="font-medium text-popover-foreground">
											{formatOnboardingDate(user.welcomeCompletedAt)}
										</dd>
									</div>
									<div className="flex items-center justify-between gap-4">
										<dt className="text-muted-foreground">Terms agreed</dt>
										<dd className="font-medium text-popover-foreground">
											{formatOnboardingDate(user.agreedToTermsAt)}
										</dd>
									</div>
									<div className="flex items-center justify-between gap-4">
										<dt className="text-muted-foreground">Journals</dt>
										<dd className="font-medium text-popover-foreground">
											{user.journalCount}
										</dd>
									</div>
									<div className="flex items-center justify-between gap-4">
										<dt className="text-muted-foreground">Entries</dt>
										<dd className="font-medium text-popover-foreground">
											{user.entryCount}
										</dd>
									</div>
								</dl>

								<UserBillingSection
									billing={user.billing}
									stripeCustomerId={user.stripeCustomerId}
								/>
							</div>
						)}
					</div>

					{user ? (
						<div className="flex shrink-0 flex-col gap-2 border-border border-t px-6 py-4 sm:flex-row sm:flex-wrap">
							{user.role === "admin" ? (
								<Button
									type="button"
									variant="default"
									size="sm"
									className={`flex-1 ${adminDestructiveButtonClass}`}
									onClick={() =>
										setConfirmAction({ type: "role", role: "user" })
									}
								>
									Remove admin
								</Button>
							) : (
								<Button
									type="button"
									variant="default"
									size="sm"
									className={`flex-1 ${adminPrimaryButtonSmClass}`}
									onClick={() =>
										setConfirmAction({ type: "role", role: "admin" })
									}
								>
									Make admin
								</Button>
							)}
							{user.accountStatus === "suspended" ? (
								<Button
									type="button"
									variant="default"
									size="sm"
									className={`flex-1 ${adminPrimaryButtonSmClass}`}
									onClick={() =>
										setConfirmAction({
											type: "status",
											status: "active",
										})
									}
								>
									Unsuspend
								</Button>
							) : (
								<Button
									type="button"
									variant="default"
									size="sm"
									className={`flex-1 ${adminDestructiveButtonClass}`}
									onClick={() =>
										setConfirmAction({
											type: "status",
											status: "suspended",
										})
									}
								>
									Suspend account
								</Button>
							)}
							{user.betaAccess ? (
								<Button
									type="button"
									variant="default"
									size="sm"
									className={`flex-1 ${adminDestructiveButtonClass}`}
									onClick={() =>
										setConfirmAction({ type: "beta", betaAccess: false })
									}
								>
									Remove beta
								</Button>
							) : (
								<Button
									type="button"
									variant="default"
									size="sm"
									className={`flex-1 ${adminPrimaryButtonSmClass}`}
									onClick={() =>
										setConfirmAction({ type: "beta", betaAccess: true })
									}
								>
									Grant beta access
								</Button>
							)}
						</div>
					) : null}
				</DialogContent>
			</Dialog>

			<Dialog
				open={confirmAction !== null}
				onOpenChange={(o) => !o && closeConfirm()}
			>
				<DialogContent
					overlayClassName={adminDialogOverlayClass}
					className={`max-w-sm rounded-2xl ${adminDialogContentClass}`}
				>
					<DialogHeader>
						<DialogTitle className="font-heading">{confirmTitle}</DialogTitle>
						<DialogDescription>{confirmDescription}</DialogDescription>
					</DialogHeader>
					<DialogFooter className="flex-row justify-end gap-2 sm:flex-row sm:justify-end">
						<Button
							type="button"
							variant="outline"
							className="h-11 min-w-[5.5rem] rounded-xl"
							disabled={pending}
							onClick={closeConfirm}
						>
							Cancel
						</Button>
						<Button
							type="button"
							variant="default"
							className={
								isDestructiveConfirmAction(confirmAction)
									? adminDestructiveConfirmButtonClass
									: adminPrimaryButtonClass
							}
							disabled={pending}
							onClick={runConfirmedAction}
						>
							{pending ? (
								<>
									<Loader2 className="size-4 animate-spin" aria-hidden />
									{confirmButtonLabel(confirmAction, true)}
								</>
							) : (
								confirmButtonLabel(confirmAction, false)
							)}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
