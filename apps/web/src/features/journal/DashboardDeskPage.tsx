import { useUser } from "@clerk/react";
import type { Id } from "@legacy-building/backend/convex/_generated/dataModel";
import { useCurrentUser } from "@legacy-building/ui/hooks/use-current-user";
import { assets } from "@legacy-building/ui/lib/brand-journal";
import { useCallback, useState } from "react";
import { ProfileAvatarEditor } from "@/components/account/profile-avatar-editor";
import { useJournalPaywall } from "@/components/billing/JournalPaywallProvider";
import { DashboardFooter } from "@/components/journal/dashboard/DashboardFooter";
import { DeskHeroCard } from "@/components/journal/dashboard/DeskHeroCard";
import { DeskRecentJournal } from "@/components/journal/dashboard/DeskRecentJournal";
import { AddJournalEntryPanel } from "@/components/journal/library/AddJournalEntryPanel";
import { JournalDetailSheet } from "@/components/journal/library/JournalDetailSheet";
import type { StoryTab } from "@/lib/journal/journalTypes";

export function DashboardDeskPage() {
	const { user } = useUser();
	const { convexUser } = useCurrentUser();
	const { guardJournalAction } = useJournalPaywall();

	const [selectedJournalId, setSelectedJournalId] =
		useState<Id<"journals"> | null>(null);
	const [entryPanelJournalId, setEntryPanelJournalId] =
		useState<Id<"journals"> | null>(null);
	const [entryPanelOpen, setEntryPanelOpen] = useState(false);

	const userName =
		convexUser?.name ??
		user?.fullName ??
		user?.firstName ??
		user?.primaryEmailAddress?.emailAddress ??
		"there";

	const avatarUrl =
		convexUser?.profilePictureUrl ?? user?.imageUrl ?? assets.defaultAvatar;
	const hasCustomPhoto = Boolean(convexUser?.profilePictureId);

	const handleOpenJournal = useCallback(
		(journalId: Id<"journals">, _tab: StoryTab) => {
			guardJournalAction(() => {
				setEntryPanelOpen(false);
				setEntryPanelJournalId(null);
				setSelectedJournalId(journalId);
			});
		},
		[guardJournalAction],
	);

	const handleAddEntry = useCallback(
		(journalId: Id<"journals">, _tab: StoryTab) => {
			guardJournalAction(() => {
				setSelectedJournalId(null);
				setEntryPanelJournalId(journalId);
				setEntryPanelOpen(true);
			});
		},
		[guardJournalAction],
	);

	const handleEntryPanelOpenChange = useCallback((next: boolean) => {
		setEntryPanelOpen(next);
		if (!next) {
			window.setTimeout(() => setEntryPanelJournalId(null), 300);
		}
	}, []);

	return (
		<div className="relative flex min-h-svh w-full flex-col bg-white">
			<div className="mt-20 flex min-h-[calc(100svh-5rem)] flex-1 flex-col md:px-10 md:py-5">
				<DeskHeroCard className="min-h-0 flex-1 rounded-none md:rounded-[20px]">
					<div className="relative flex w-full max-w-[1200px] flex-1 flex-col items-center gap-6 pb-6 lg:min-h-[420px] lg:justify-center lg:gap-0 lg:pb-0">
						<div className="flex flex-col items-center gap-4 pt-2 sm:gap-6 sm:pt-4 lg:pt-0">
							<ProfileAvatarEditor
								variant="desk"
								src={avatarUrl}
								hasCustomPhoto={hasCustomPhoto}
							/>
							<h1 className="text-center font-bold text-[clamp(1.75rem,4.5vw,2rem)] text-foreground leading-[1.4]">
								Hi, {userName}
							</h1>
						</div>

						<div
							className={[
								"w-full max-w-[min(340px,100%)] shrink-0 self-center px-1",
								"lg:absolute lg:top-[18%] lg:left-0 lg:mb-0 lg:px-0",
								"xl:top-[22%]",
							].join(" ")}
						>
							<DeskRecentJournal
								onOpenJournal={handleOpenJournal}
								onAddEntry={handleAddEntry}
							/>
						</div>
					</div>
				</DeskHeroCard>

				<DashboardFooter />
			</div>

			<JournalDetailSheet
				journalId={selectedJournalId}
				open={selectedJournalId !== null}
				onOpenChange={(next) => {
					if (!next) setSelectedJournalId(null);
				}}
				onDeleted={() => setSelectedJournalId(null)}
			/>

			<AddJournalEntryPanel
				journalId={entryPanelJournalId}
				open={entryPanelOpen}
				onOpenChange={handleEntryPanelOpenChange}
			/>
		</div>
	);
}
