import { useUser } from "@clerk/react";
import { api } from "@legacy-building/backend/convex/_generated/api";
import { PageLoader } from "@legacy-building/ui/components/page-loader";
import { useCurrentUser } from "@legacy-building/ui/hooks/use-current-user";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { Info, User, X } from "lucide-react";
import { useEffect, useState } from "react";

import {
	accountBillingBannerClass,
	accountBillingBannerDismissClass,
	accountBillingBannerLinkClass,
	accountCardClass,
	accountDangerButtonClass,
	accountDangerZoneBodyClass,
	accountDangerZoneHeaderClass,
	accountPageClass,
	accountPrimaryButtonClass,
	accountSecondaryButtonClass,
	accountSectionSubtitleClass,
	accountSectionTitleClass,
	accountWarningBoxClass,
} from "@/components/account/accountFormStyles";
import { DeleteAccountDialog } from "@/components/account/delete-account-dialog";
import { PersonalInfoCard } from "@/components/account/personal-info-card";
import { Button } from "@/components/journal/ui/button";
import { defaultUsername } from "@/lib/account/username";
import {
	messageFromUnknownError,
	toastMutationError,
	toastMutationSuccess,
} from "@/lib/journal/toast";
import { ROUTES } from "@/lib/routes";

function formatShortDate(ms: number) {
	return new Date(ms).toLocaleDateString(undefined, {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
}

function formatBillingBannerDate(seconds: number) {
	return new Date(seconds * 1000).toLocaleDateString(undefined, {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
	});
}

function planLabel(interval: "monthly" | "annual" | null, planName?: string) {
	if (planName) return `${planName} Plan`;
	if (interval === "annual") return "Annual Plan";
	if (interval === "monthly") return "Monthly Plan";
	return "Subscription";
}

export function DashboardAccountPage() {
	const { user, isLoaded: clerkLoaded } = useUser();
	const { convexUser, isLoading } = useCurrentUser();
	const subscription = useQuery(api.stripe.queries.getMySubscription);
	const updateProfile = useMutation(api.user.mutations.updateProfile);

	const [username, setUsername] = useState("");
	const [savingUsername, setSavingUsername] = useState(false);
	const [deleteOpen, setDeleteOpen] = useState(false);
	const [bannerDismissed, setBannerDismissed] = useState(false);

	const email =
		user?.primaryEmailAddress?.emailAddress ?? convexUser?.email ?? "";

	useEffect(() => {
		if (!clerkLoaded || isLoading) return;
		setUsername(defaultUsername(convexUser?.name, user?.fullName ?? null));
	}, [clerkLoaded, isLoading, convexUser?.name, user?.fullName]);

	const handleUsernameUpdate = async () => {
		const trimmed = username.trim();
		if (trimmed.length < 2) {
			toastMutationError(
				new Error("Username too short"),
				"Username must be at least 2 characters.",
			);
			return;
		}
		setSavingUsername(true);
		try {
			await updateProfile({ name: trimmed });
			toastMutationSuccess("Username updated.");
		} catch (err) {
			toastMutationError(
				err,
				messageFromUnknownError(
					err,
					"Could not update username. Please try again.",
				),
			);
		} finally {
			setSavingUsername(false);
		}
	};

	if (!clerkLoaded || isLoading || subscription === undefined) {
		return <PageLoader />;
	}

	const hasLivePlan =
		subscription &&
		(subscription.status === "active" ||
			subscription.status === "trialing" ||
			subscription.status === "past_due");

	const showBillingBanner =
		hasLivePlan && subscription.currentPeriodEnd && !bannerDismissed;

	const activeSinceMs = convexUser?._creationTime;
	const currentPlanName = planLabel(
		subscription?.interval ?? null,
		subscription?.plan?.name,
	);

	return (
		<div className="relative flex min-h-svh w-full flex-col bg-secondary">
			<div className="mt-20 flex flex-1 flex-col px-4 py-8 sm:px-6 md:px-10 md:py-10">
				<div className={accountPageClass}>
					<header className="flex flex-col gap-2">
						<h1 className="font-semibold text-3xl text-foreground">
							Account Settings
						</h1>
						<p className={accountSectionSubtitleClass}>
							Manage your identity and security preferences across the Legacy
							Building platform.
						</p>
					</header>

					{showBillingBanner ? (
						<div className={accountBillingBannerClass}>
							<Info
								className="mt-0.5 size-5 shrink-0 text-primary"
								aria-hidden
							/>
							<div className="min-w-0 flex-1 text-foreground text-sm leading-relaxed">
								<span className="font-medium">Next Billing date on </span>
								{formatBillingBannerDate(subscription.currentPeriodEnd)}. Ensure
								timely subscription renewal to keep enjoying {currentPlanName}.
								<Link
									to={ROUTES.dashboardBilling}
									className={accountBillingBannerLinkClass}
								>
									View Details
								</Link>
							</div>
							<button
								type="button"
								onClick={() => setBannerDismissed(true)}
								className={accountBillingBannerDismissClass}
								aria-label="Dismiss billing reminder"
							>
								<X className="size-4" aria-hidden />
							</button>
						</div>
					) : null}

					<section className="flex flex-col gap-4">
						<div className="flex flex-col gap-1">
							<h2 className={accountSectionTitleClass}>Personal Information</h2>
							<p className={accountSectionSubtitleClass}>
								Update your profile details and contact information.
							</p>
						</div>

						<PersonalInfoCard
							username={username}
							onUsernameChange={setUsername}
							onUsernameUpdate={() => void handleUsernameUpdate()}
							savingUsername={savingUsername}
							email={email}
						/>
					</section>

					<section className="flex flex-col gap-4">
						<div className="flex flex-col gap-1">
							<h2 className={accountSectionTitleClass}>Plan Status</h2>
							<p className={accountSectionSubtitleClass}>
								View your current subscription and billing details.
							</p>
						</div>

						<div className={accountCardClass}>
							{hasLivePlan ? (
								<div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
									<div className="flex flex-col gap-3">
										<div className="flex items-center gap-2">
											<span
												className="size-2.5 rounded-full bg-green-500"
												aria-hidden
											/>
											<span className="font-semibold text-foreground text-lg">
												{currentPlanName}
											</span>
										</div>
										{activeSinceMs ? (
											<p className="text-muted-foreground text-sm">
												<span className="font-medium text-foreground">
													Active Since:{" "}
												</span>
												{formatShortDate(activeSinceMs)}
											</p>
										) : null}
									</div>
									<Link
										to={ROUTES.dashboardBilling}
										className={accountSecondaryButtonClass}
									>
										Manage Subscription
									</Link>
								</div>
							) : (
								<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
									<div className="flex items-center gap-2">
										<User
											className="size-5 text-muted-foreground"
											aria-hidden
										/>
										<p className="text-muted-foreground text-sm">
											You don&apos;t have an active subscription.
										</p>
									</div>
									<Link
										to={ROUTES.dashboardBilling}
										className={accountPrimaryButtonClass}
									>
										View Plans
									</Link>
								</div>
							)}
						</div>
					</section>

					<section className="flex flex-col gap-0 overflow-hidden rounded-2xl shadow-sm">
						<div className={accountDangerZoneHeaderClass}>
							<h2 className="font-semibold text-destructive text-lg">
								Danger Zone
							</h2>
							<p className="text-destructive/80 text-sm">
								Irreversible and destructive actions.
							</p>
						</div>
						<div className={accountDangerZoneBodyClass}>
							<div className="flex flex-col gap-4">
								<div>
									<h3 className="font-semibold text-base text-foreground">
										Delete Account
									</h3>
									<p className="mt-1 max-w-2xl text-muted-foreground text-sm leading-relaxed">
										Once you delete your account, there is no going back. Your
										subscription will be cancelled, and all your data, journals,
										and entries will be permanently deleted.
									</p>
								</div>
								<div className={accountWarningBoxClass}>
									This action cannot be undone. Make sure to export your data
									before deleting your account.
								</div>
								<div className="flex justify-end">
									<Button
										type="button"
										variant="destructive"
										onClick={() => setDeleteOpen(true)}
										className={accountDangerButtonClass}
									>
										Delete My Account
									</Button>
								</div>
							</div>
						</div>
					</section>
				</div>
			</div>

			<DeleteAccountDialog open={deleteOpen} onOpenChange={setDeleteOpen} />
		</div>
	);
}
