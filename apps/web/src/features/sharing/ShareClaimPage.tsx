import { useAuth, useClerk, useUser } from "@clerk/react";
import { api } from "@legacy-building/backend/convex/_generated/api";
import { PageLoader } from "@legacy-building/ui/components/page-loader";
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
import { motion } from "motion/react";
import { type ReactNode, useEffect, useState } from "react";

import { GoogleOAuthButton } from "@/components/auth/google-oauth-button";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { messageFromUnknownError } from "@/lib/journal/toast";
import { ROUTES } from "@/lib/routes";
import {
	clearPendingShareToken,
	storePendingShareToken,
} from "@/lib/sharing/pendingShare";

const cardClass = "rounded-2xl border border-border bg-card p-5 shadow-sm";
const primaryButtonClass =
	"flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-6 font-semibold text-primary-foreground text-sm shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60";

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

function Hero() {
	return (
		<div className="flex flex-col items-center gap-2 rounded-2xl bg-gradient-to-br from-primary/15 via-background to-primary/25 px-5 py-8 text-center shadow-sm">
			<span className="flex size-12 items-center justify-center rounded-full bg-background text-primary">
				<Users className="size-6" aria-hidden />
			</span>
			<p className="font-serif text-4xl text-primary italic">
				You&apos;re Invited
			</p>
		</div>
	);
}

function Notice({ title, body }: { title: string; body: string }) {
	const navigate = useNavigate();
	return (
		<Shell>
			<Hero />
			<section className={`${cardClass} flex flex-col gap-3 text-center`}>
				<h1 className="font-semibold text-foreground text-xl">{title}</h1>
				<p className="text-muted-foreground text-sm leading-relaxed">{body}</p>
				<button
					type="button"
					className={primaryButtonClass}
					onClick={() => void navigate({ to: ROUTES.home })}
				>
					Go to Legacy Building
				</button>
			</section>
		</Shell>
	);
}

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
 * `/share/<token>`: the link in the invite email (new users) and a fallback
 * for anyone opening it on the web. Sign in, or create the account with the
 * invited email greyed out, then Accept Invite.
 */
export function ShareClaimPage({ token }: { token: string }) {
	const navigate = useNavigate();
	const { isLoaded, isSignedIn } = useAuth();
	const { user } = useUser();
	const { signOut } = useClerk();
	const info = useQuery(api.sharing.queries.getInviteByToken, { token });
	const ensureCurrentUser = useMutation(api.user.mutations.ensureCurrentUser);
	const acceptInvite = useMutation(api.sharing.mutations.acceptInvite);
	const [accepting, setAccepting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (info && info.status === "pending") storePendingShareToken(token);
		if (info === null || (info && info.status !== "pending")) {
			clearPendingShareToken();
		}
		if (info?.viewer && !info.viewer.emailMatches) clearPendingShareToken();
	}, [info, token]);

	if (!isLoaded || info === undefined) return <PageLoader />;

	if (info === null) {
		return (
			<Notice
				title="This invite link isn't valid"
				body="Check that you opened the full link from the invite email."
			/>
		);
	}
	if (info.status === "accepted" && info.viewer?.isMember) {
		return (
			<Shell>
				<Hero />
				<section className={`${cardClass} flex flex-col gap-3 text-center`}>
					<h1 className="font-semibold text-foreground text-xl">
						You&apos;re already in this journal
					</h1>
					<button
						type="button"
						className={primaryButtonClass}
						onClick={() =>
							void navigate({
								to: ROUTES.dashboardLibrary,
								state: { storyTab: "our_story", journalId: info.journalId },
							})
						}
					>
						Open {info.journalTitle}
					</button>
				</section>
			</Shell>
		);
	}
	if (info.status === "accepted") {
		return (
			<Notice
				title="This invite has already been accepted"
				body="Each invite can be accepted once. Ask the journal's author to send a new one if you need it."
			/>
		);
	}
	if (info.status === "expired") {
		return (
			<Notice
				title="This invite has expired"
				body={`Invites last 30 days. Ask ${info.authorName} to send a new one.`}
			/>
		);
	}

	const inviteCard = (
		<>
			<Hero />
			<section className={cardClass}>
				<Row
					icon={<UserRound className="size-4" aria-hidden />}
					label="Invited by"
					value={info.authorName}
				/>
				<Row
					icon={<BookOpen className="size-4" aria-hidden />}
					label="Journal"
					value={info.journalTitle}
				/>
				<p className="mt-4 font-medium text-foreground text-sm">
					In a shared journal, you can
				</p>
				<ul className="mt-2 flex flex-col gap-2 text-foreground text-sm">
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
			</section>
		</>
	);

	if (!isSignedIn) {
		return (
			<Shell>
				{inviteCard}
				<section className={cardClass}>
					{info.hasAccountForEmail ? (
						<div className="flex flex-col gap-3 text-center">
							<p className="text-foreground text-sm">
								Sign in as{" "}
								<span className="font-medium">{info.inviteEmail}</span> to
								accept.
							</p>
							<button
								type="button"
								className={primaryButtonClass}
								onClick={() => void navigate({ to: ROUTES.login })}
							>
								Sign in to accept
							</button>
						</div>
					) : (
						<div className="flex flex-col gap-4">
							<div>
								<h2 className="font-semibold text-foreground text-lg">
									Create your account
								</h2>
								<p className="text-muted-foreground text-sm">
									Set a password for {info.inviteEmail} to join the journal.
								</p>
							</div>
							<SignUpForm lockedEmail={info.inviteEmail} />
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
								With Google, use the {info.maskedInviteEmail} account.
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
				{inviteCard}
				<section className={`${cardClass} flex flex-col gap-3 text-center`}>
					<p className="text-foreground text-sm">
						This invite was sent to{" "}
						<span className="font-medium">{info.maskedInviteEmail}</span>, but
						you&apos;re signed in as{" "}
						<span className="font-medium">{info.viewer.email}</span>.
					</p>
					<button
						type="button"
						className={primaryButtonClass}
						onClick={() => {
							storePendingShareToken(token);
							void signOut({ redirectUrl: `${ROUTES.shareClaim}/${token}` });
						}}
					>
						Switch account
					</button>
				</section>
			</Shell>
		);
	}

	const handleAccept = async () => {
		setAccepting(true);
		setError(null);
		try {
			const username = user?.username?.trim();
			await ensureCurrentUser({
				preferredName: username && username.length >= 2 ? username : undefined,
			});
			const { journalId } = await acceptInvite({ token });
			clearPendingShareToken();
			await navigate({
				to: ROUTES.dashboardLibrary,
				state: { storyTab: "our_story", journalId },
			});
		} catch (err) {
			setError(
				messageFromUnknownError(err, "Could not accept the invite. Try again."),
			);
		} finally {
			setAccepting(false);
		}
	};

	return (
		<Shell>
			{inviteCard}
			{error ? (
				<p className="text-center text-destructive text-sm" role="alert">
					{error}
				</p>
			) : null}
			<button
				type="button"
				className={primaryButtonClass}
				disabled={accepting}
				onClick={() => void handleAccept()}
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
		</Shell>
	);
}
