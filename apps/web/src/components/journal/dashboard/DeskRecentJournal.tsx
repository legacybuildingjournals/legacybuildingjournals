import { api } from "@legacy-building/backend/convex/_generated/api";
import type { Id } from "@legacy-building/backend/convex/_generated/dataModel";
import { cn } from "@legacy-building/ui/lib/utils";
import { useQuery } from "convex/react";
import { RecentJournalCard } from "@/components/journal/dashboard/RecentJournalCard";
import type { StoryTab } from "@/lib/journal/journalTypes";

type DeskRecentJournalProps = {
	className?: string;
	onOpenJournal: (journalId: Id<"journals">, storyTab: StoryTab) => void;
	onAddEntry: (journalId: Id<"journals">, storyTab: StoryTab) => void;
};

export function DeskRecentJournal({
	className,
	onOpenJournal,
	onAddEntry,
}: DeskRecentJournalProps) {
	const recent = useQuery(api.journal.queries.getRecentForDesk);

	if (recent === undefined) {
		return (
			<div className={cn("w-full max-w-[min(340px,100%)]", className)}>
				<h2 className="mb-2 text-center font-bold text-[#1a1a1a] text-[clamp(1.875rem,5vw,2.125rem)] leading-[1.4]">
					Recent Journal
				</h2>
				<div className="h-[268px] animate-pulse rounded-xl bg-white/60 shadow-sm" />
			</div>
		);
	}

	if (recent === null) {
		return null;
	}

	const { journal, slideImageUrls, postedAtMs } = recent;

	return (
		<RecentJournalCard
			className={className}
			title={journal.title}
			dateMs={postedAtMs}
			slideImageUrls={slideImageUrls}
			onOpenJournal={() => onOpenJournal(journal._id, journal.type as StoryTab)}
			onAddEntry={() => onAddEntry(journal._id, journal.type as StoryTab)}
		/>
	);
}
