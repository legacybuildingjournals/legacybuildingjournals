import { api } from "@legacy-building/backend/convex/_generated/api";
import type { Id } from "@legacy-building/backend/convex/_generated/dataModel";
import { assets } from "@legacy-building/ui/lib/brand-journal";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { Gift, Heart, Sprout, Users } from "lucide-react";
import type { ReactNode } from "react";

import { GiftPageChrome } from "@/components/gift/GiftPageChrome";
import { Skeleton } from "@/components/journal/ui/skeleton";
import { ShareJournalForm } from "@/components/sharing/ShareJournalForm";
import type { LibraryLocationState } from "@/lib/journal/libraryNavigation";
import { ROUTES } from "@/lib/routes";

const FEATURES = [
	{
		icon: Gift,
		title: "A Meaningful Gift",
		body: "Share memories, not just things.",
	},
	{
		icon: Heart,
		title: "Build Connections",
		body: "Bring your loved ones closer.",
	},
	{
		icon: Sprout,
		title: "Create a Legacy",
		body: "Create a legacy, together.",
	},
] as const;

/** Artwork card (Figma): "Share This Journal" image over three short promises. */
function ShareArtworkCard() {
	return (
		<section className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
			<div className="aspect-[540/375] overflow-hidden bg-secondary">
				<img
					src={assets.shareJournalHero}
					alt="Share this journal"
					className="size-full object-cover"
					loading="eager"
					decoding="async"
				/>
			</div>
			<ul className="grid flex-1 grid-cols-3 bg-primary/10 px-2 py-5">
				{FEATURES.map(({ icon: Icon, title, body }, index) => (
					<li
						key={title}
						className={`flex flex-col items-center gap-1.5 px-2 text-center ${
							index > 0 ? "border-primary/15 border-l" : ""
						}`}
					>
						<span className="flex size-9 items-center justify-center rounded-full bg-background text-primary shadow-sm">
							<Icon className="size-4" aria-hidden />
						</span>
						<p className="font-semibold text-foreground text-xs leading-tight sm:text-sm">
							{title}
						</p>
						<p className="text-[11px] text-muted-foreground leading-snug sm:text-xs">
							{body}
						</p>
					</li>
				))}
			</ul>
		</section>
	);
}

function ShareSkeleton() {
	return (
		<div className="grid gap-6 md:grid-cols-2 lg:gap-8">
			<Skeleton className="aspect-[540/500] w-full rounded-2xl" />
			<Skeleton className="h-[460px] w-full rounded-2xl" />
		</div>
	);
}

/** Shown when this journal can't be shared from here (not yours, or already shared). */
function ShareUnavailable({
	title,
	body,
	backState,
}: {
	title: string;
	body: string;
	backState: LibraryLocationState | undefined;
}) {
	return (
		<div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
			<span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
				<Users className="size-5" aria-hidden />
			</span>
			<h2 className="font-semibold text-foreground text-lg">{title}</h2>
			<p className="text-muted-foreground text-sm">{body}</p>
			<Link
				to={ROUTES.dashboardLibrary}
				state={backState}
				className="mt-2 inline-flex h-11 items-center justify-center rounded-full bg-primary px-6 font-semibold text-primary-foreground text-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-[0.98]"
			>
				Back to Library
			</Link>
		</div>
	);
}

/**
 * Figma "Share Journal" page, opened from the journal sheet's add-person
 * button. Desktop shows the artwork and the invite form side by side at equal
 * height; phones stack them. Back returns to the Library with the journal
 * open again.
 */
export function ShareJournalPage({ journalId }: { journalId: Id<"journals"> }) {
	const navigate = useNavigate();
	const journal = useQuery(api.journal.queries.getById, { id: journalId });
	const sharing = useQuery(api.sharing.queries.getForJournal, { journalId });

	const backState: LibraryLocationState | undefined = journal
		? { journalId, storyTab: journal.type }
		: undefined;

	const loading = journal === undefined || sharing === undefined;
	const canShare =
		sharing?.viewerRole === "author" &&
		sharing.member === null &&
		sharing.pendingInvite === null;

	let content: ReactNode;
	if (loading) {
		content = <ShareSkeleton />;
	} else if (!journal || !sharing || sharing.viewerRole !== "author") {
		content = (
			<ShareUnavailable
				title="Journal not available"
				body="Only the journal's author can share it."
				backState={backState}
			/>
		);
	} else if (!canShare) {
		content = (
			<ShareUnavailable
				title={sharing.member ? "Already shared" : "Invite pending"}
				body={
					sharing.member
						? "This journal is already shared with a member."
						: `An invite is waiting for ${sharing.pendingInvite?.email}. Cancel it from the journal to invite someone else.`
				}
				backState={backState}
			/>
		);
	} else {
		content = (
			<div className="grid items-stretch gap-6 md:grid-cols-2 lg:gap-8">
				<ShareArtworkCard />
				<ShareJournalForm
					journalId={journalId}
					onSent={() =>
						void navigate({ to: ROUTES.dashboardLibrary, state: backState })
					}
				/>
			</div>
		);
	}

	return (
		<GiftPageChrome
			title="Share Journal"
			backTo={ROUTES.dashboardLibrary}
			backState={backState}
			wide
		>
			{content}
		</GiftPageChrome>
	);
}
