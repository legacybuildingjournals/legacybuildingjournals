import { useAuth, useClerk, useUser } from "@clerk/react";
import { api } from "@legacy-building/backend/convex/_generated/api";
import { PageLoader } from "@legacy-building/ui/components/page-loader";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import {
	BookOpen,
	CheckCircle2,
	Gift,
	Infinity as InfinityIcon,
	Loader2,
	User,
} from "lucide-react";
import { motion } from "motion/react";
import { type ReactNode, useEffect, useState } from "react";

import { GoogleOAuthButton } from "@/components/auth/google-oauth-button";
import { SignUpForm } from "@/components/auth/sign-up-form";
import {
	GiftHero,
	giftCardClass,
	giftPrimaryButtonClass,
} from "@/components/gift/GiftPageChrome";
import { StoreSubscriptionSplash } from "@/components/gift/StoreSubscriptionSplash";
import {
	clearPendingGiftToken,
	storePendingGiftToken,
} from "@/lib/gift/pendingGift";
import { messageFromUnknownError } from "@/lib/journal/toast";
import { ROUTES } from "@/lib/routes";

function Shell({ children }: { children: ReactNode }) {
	return (
		<main className="flex min-h-svh w-full justify-center bg-secondary px-4 py-6 md:py-12">
			<motion.div
				initial={{ opacity: 0, y: 8 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.2, ease: "easeOut" }}
				className="flex w-full max-w-[480px] flex-col gap-4"
			>
				{children}
			</motion.div>
		</main>
	);
}

function Notice({ title, body }: { title: string; body: string }) {
	const navigate = useNavigate();
	return (
		<Shell>
			<GiftHero variant="redeem" />
			<section className={`${giftCardClass} flex flex-col gap-3 text-center`}>
				<h1 className="font-semibold text-foreground text-xl">{title}</h1>
				<p className="text-muted-foreground text-sm leading-relaxed">{body}</p>
				<button
					type="button"
					className={giftPrimaryButtonClass}
					onClick={() => void navigate({ to: ROUTES.home })}
				>
					Go to Legacy Building
				</button>
			</section>
		</Shell>
	);
}

function InfoRow({
	icon,
	label,
	value,
}: {
	icon: ReactNode;
	label: string;
	value: string;
}) {
	return (
		<div className="flex items-center gap-3 border-border border-b py-3 last:border-b-0">
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
 * SST-7: `/gift/<token>`. The QR code and Claim My Gift link always land here
 * (web only). Signed out: sign in, or create the account with the gift's
 * email greyed out. Signed in with the matching email: Claim My Gift.
 */
export function GiftRedeemPage({ token }: { token: string }) {
	const navigate = useNavigate();
	const { isLoaded, isSignedIn } = useAuth();
	const { user } = useUser();
	const { signOut } = useClerk();
	const info = useQuery(api.gifts.queries.getRedeemInfo, { token });
	const ensureCurrentUser = useMutation(api.user.mutations.ensureCurrentUser);
	const redeem = useMutation(api.gifts.mutations.redeem);

	const [claiming, setClaiming] = useState(false);
	const [claimError, setClaimError] = useState<string | null>(null);
	const [claimed, setClaimed] = useState(false);
	const [storeToCancel, setStoreToCancel] = useState<
		"app_store" | "play_store" | null
	>(null);

	// Remember the gift while the visitor signs in / up (incl. Google), so the
	// app brings them back here afterwards (see PendingGiftRedirect).
	useEffect(() => {
		if (info && info.status === "paid" && !claimed) {
			storePendingGiftToken(token);
		}
		if (info === null || (info && info.status !== "paid")) {
			clearPendingGiftToken();
		}
		// Signed in with the wrong account, or already lifetime: don't keep
		// bouncing them back here ("Switch account" stores it again).
		if (
			info?.viewer &&
			(!info.viewer.emailMatches || info.viewer.hasLifetime)
		) {
			clearPendingGiftToken();
		}
	}, [info, token, claimed]);

	if (!isLoaded || info === undefined) return <PageLoader />;

	if (info === null) {
		return (
			<Notice
				title="This gift link isn't valid"
				body="Check that you opened the full link from the gift email or scanned the QR code on the gift card."
			/>
		);
	}

	if (claimed) {
		return (
			<Shell>
				<section
					className={`${giftCardClass} flex flex-col items-center gap-4 text-center`}
				>
					<CheckCircle2 className="size-12 text-primary" aria-hidden />
					<h1 className="font-semibold text-foreground text-xl">
						Your lifetime access is active
					</h1>
					<p className="text-muted-foreground text-sm leading-relaxed">
						A gift from {info.purchaserName}. Use the app or the web with this
						account. No subscription needed, ever.
					</p>
					<button
						type="button"
						className={giftPrimaryButtonClass}
						onClick={() => void navigate({ to: ROUTES.dashboard })}
					>
						Start my legacy
					</button>
				</section>
				<StoreSubscriptionSplash
					store={storeToCancel}
					open={storeToCancel !== null}
					onClose={() => setStoreToCancel(null)}
				/>
			</Shell>
		);
	}

	if (info.status === "redeemed") {
		return (
			<Notice
				title="This gift has already been claimed"
				body="Each gift can be claimed once. If this was you, sign in to Legacy Building with the account you claimed it on."
			/>
		);
	}
	if (info.status === "expired") {
		return (
			<Notice
				title="This gift has expired"
				body={`Gifts can be claimed for 12 months. Please contact ${info.purchaserName} or our support team.`}
			/>
		);
	}
	if (info.status !== "paid") {
		return (
			<Notice
				title="This gift is no longer available"
				body="Please contact the person who sent it, or our support team."
			/>
		);
	}

	const giftCard = (
		<>
			<GiftHero variant="redeem" />
			<p className="text-center text-foreground text-sm">
				<span className="font-semibold">{info.purchaserName}</span> has gifted
				you a lifetime membership to Legacy Building Journals.
			</p>
			<section className={giftCardClass}>
				<InfoRow
					icon={<User className="size-4" aria-hidden />}
					label="Gifted by"
					value={info.purchaserName}
				/>
				<InfoRow
					icon={<Gift className="size-4" aria-hidden />}
					label="Gift"
					value={info.title}
				/>
				{info.message ? (
					<p className="mt-3 whitespace-pre-line rounded-xl bg-primary/5 p-3 text-foreground text-sm italic">
						{info.message}
					</p>
				) : null}
				<p className="mt-4 font-medium text-foreground text-sm">
					With lifetime access you can
				</p>
				<ul className="mt-2 flex flex-col gap-2 text-foreground text-sm">
					<li className="flex items-center gap-2">
						<BookOpen className="size-4 text-primary" aria-hidden />
						Write, record, and preserve your stories
					</li>
					<li className="flex items-center gap-2">
						<InfinityIcon className="size-4 text-primary" aria-hidden />
						Use every feature with no subscription, ever
					</li>
				</ul>
			</section>
		</>
	);

	if (!isSignedIn) {
		return (
			<Shell>
				{giftCard}
				<section className={giftCardClass}>
					{info.hasAccountForEmail ? (
						<div className="flex flex-col gap-3 text-center">
							<p className="text-foreground text-sm">
								Sign in as{" "}
								<span className="font-medium">{info.recipientEmail}</span> to
								claim your gift.
							</p>
							<button
								type="button"
								className={giftPrimaryButtonClass}
								onClick={() => void navigate({ to: ROUTES.login })}
							>
								Sign in to claim my gift
							</button>
						</div>
					) : (
						<div className="flex flex-col gap-4">
							<div>
								<h2 className="font-semibold text-foreground text-lg">
									Activate your account
								</h2>
								<p className="text-muted-foreground text-sm">
									Set a password for {info.recipientEmail} to claim your gift.
								</p>
							</div>
							<SignUpForm lockedEmail={info.recipientEmail} />
							<div className="relative py-1">
								<div className="absolute inset-0 flex items-center" aria-hidden>
									<span className="w-full border-border border-t" />
								</div>
								<div className="relative flex justify-center font-medium text-muted-foreground text-xs uppercase tracking-[0.14em]">
									<span className="bg-card px-3">Or</span>
								</div>
							</div>
							<GoogleOAuthButton mode="sign-up" />
							<p className="text-center text-muted-foreground text-xs">
								With Google, use the {info.maskedRecipientEmail} account.
							</p>
						</div>
					)}
				</section>
			</Shell>
		);
	}

	if (info.viewer && !info.viewer.emailMatches) {
		return (
			<Shell>
				{giftCard}
				<section className={`${giftCardClass} flex flex-col gap-3 text-center`}>
					<p className="text-foreground text-sm">
						This gift was sent to{" "}
						<span className="font-medium">{info.maskedRecipientEmail}</span>,
						but you&apos;re signed in as{" "}
						<span className="font-medium">{info.viewer.email}</span>.
					</p>
					<button
						type="button"
						className={giftPrimaryButtonClass}
						onClick={() => {
							storePendingGiftToken(token);
							void signOut({ redirectUrl: `${ROUTES.giftRedeem}/${token}` });
						}}
					>
						Switch account
					</button>
				</section>
			</Shell>
		);
	}

	if (info.viewer?.hasLifetime) {
		return (
			<Notice
				title="You already have lifetime access"
				body="This account already has lifetime access, so this gift can't be added to it."
			/>
		);
	}

	const handleClaim = async () => {
		setClaiming(true);
		setClaimError(null);
		try {
			const username = user?.username?.trim();
			await ensureCurrentUser({
				preferredName: username && username.length >= 2 ? username : undefined,
			});
			const result = await redeem({ token });
			clearPendingGiftToken();
			setStoreToCancel(result.storeSubscriptionToCancel);
			setClaimed(true);
		} catch (err) {
			setClaimError(
				messageFromUnknownError(err, "Could not claim your gift. Try again."),
			);
		} finally {
			setClaiming(false);
		}
	};

	return (
		<Shell>
			{giftCard}
			{claimError ? (
				<p className="text-center text-destructive text-sm" role="alert">
					{claimError}
				</p>
			) : null}
			<button
				type="button"
				className={giftPrimaryButtonClass}
				disabled={claiming}
				onClick={() => void handleClaim()}
			>
				{claiming ? (
					<>
						<Loader2 className="size-4 animate-spin" aria-hidden />
						Claiming…
					</>
				) : (
					<>
						<Gift className="size-4" aria-hidden />
						Claim My Gift
					</>
				)}
			</button>
		</Shell>
	);
}
