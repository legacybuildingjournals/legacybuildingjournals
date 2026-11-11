import { api } from "@legacy-building/backend/convex/_generated/api";
import type {
	Doc,
	Id,
} from "@legacy-building/backend/convex/_generated/dataModel";
import { Button } from "@legacy-building/ui/components/button";
import { brand } from "@legacy-building/ui/lib/brand-journal";
import {
	type RouterState,
	useNavigate,
	useRouterState,
} from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { useCallback, useEffect, useState } from "react";
import { useJournalPaywall } from "@/components/billing/JournalPaywallProvider";
import { DashboardFooter } from "@/components/journal/dashboard/DashboardFooter";
import { AddJournalEntryPanel } from "@/components/journal/library/AddJournalEntryPanel";
import { CreateJournalDialog } from "@/components/journal/library/CreateJournalDialog";
import { JournalDetailSheet } from "@/components/journal/library/JournalDetailSheet";
import { LibraryEmptyState } from "@/components/journal/library/LibraryEmptyState";
import { LibraryJournalGrid } from "@/components/journal/library/LibraryJournalGrid";
import { LibraryStoryTabs } from "@/components/journal/library/LibraryStoryTabs";
import { OurStoryEmptyState } from "@/components/sharing/OurStoryEmptyState";
import { DEFAULT_STORY_TAB, type LibraryTab } from "@/lib/journal/journalTypes";
import { readLibraryLocationState } from "@/lib/journal/libraryNavigation";

export function DashboardLibraryPage() {
	const navigate = useNavigate();
	const { guardJournalAction, guardJournalActionFor, hasPaidAccess } =
		useJournalPaywall();
	const locationState = useRouterState({
		select: (s: RouterState) => s.location.state,
	});
	const [storyTab, setStoryTab] = useState<LibraryTab>(DEFAULT_STORY_TAB);
	const [createOpen, setCreateOpen] = useState(false);
	const [selectedJournalId, setSelectedJournalId] =
		useState<Id<"journals"> | null>(null);
	const [entryPanelJournalId, setEntryPanelJournalId] =
		useState<Id<"journals"> | null>(null);
	const [entryPanelOpen, setEntryPanelOpen] = useState(false);

	const journals = useQuery(api.journal.queries.listByType, {
		type: storyTab,
	});

	useEffect(() => {
		const nav = readLibraryLocationState(locationState);
		if (!nav || hasPaidAccess === undefined) return;

		if (nav.storyTab) {
			setStoryTab(nav.storyTab);
		}

		if (nav.journalId) {
			// Shared journals (Our Story) follow the author's access, enforced on
			// the server, so they never hit your own paywall here.
			const guard =
				nav.storyTab === "our_story"
					? (action: () => void) => action()
					: guardJournalAction;
			if (nav.openAddEntry) {
				guard(() => {
					setSelectedJournalId(null);
					setEntryPanelJournalId(nav.journalId ?? null);
					setEntryPanelOpen(true);
					void navigate({ replace: true, state: {} });
				});
			} else {
				guard(() => {
					setSelectedJournalId(nav.journalId ?? null);
					void navigate({ replace: true, state: {} });
				});
			}
			return;
		}

		void navigate({
			replace: true,
			state: {},
		});
	}, [locationState, navigate, guardJournalAction, hasPaidAccess]);

	const resetOverlays = useCallback(() => {
		setSelectedJournalId(null);
		setEntryPanelOpen(false);
		setEntryPanelJournalId(null);
		setCreateOpen(false);
	}, []);

	const handleStoryTabChange = useCallback(
		(tab: LibraryTab) => {
			if (tab === storyTab) return;
			resetOverlays();
			setStoryTab(tab);
		},
		[storyTab, resetOverlays],
	);

	useEffect(() => {
		if (!journals || !selectedJournalId) return;
		if (!journals.some((j: Doc<"journals">) => j._id === selectedJournalId)) {
			setSelectedJournalId(null);
		}
	}, [journals, selectedJournalId]);

	const openCreate = useCallback(
		() => guardJournalAction(() => setCreateOpen(true)),
		[guardJournalAction],
	);

	const handleOpenJournal = useCallback(
		(journal: Doc<"journals">) => {
			guardJournalActionFor(journal.userId, () =>
				setSelectedJournalId(journal._id),
			);
		},
		[guardJournalActionFor],
	);

	const handleAddEntry = useCallback(
		(journal: Doc<"journals">) => {
			guardJournalActionFor(journal.userId, () => {
				setSelectedJournalId(null);
				setEntryPanelJournalId(journal._id);
				setEntryPanelOpen(true);
			});
		},
		[guardJournalActionFor],
	);

	const handleEntryPanelOpenChange = useCallback((next: boolean) => {
		setEntryPanelOpen(next);
		if (!next) {
			window.setTimeout(() => setEntryPanelJournalId(null), 300);
		}
	}, []);

	const isLoading = journals === undefined;
	const isEmpty = journals !== undefined && journals.length === 0;

	return (
		<>
			<div
				aria-hidden
				className="pointer-events-none fixed inset-0 z-0 bg-center bg-cover"
				style={{
					backgroundImage:
						'url("/static/icon_libraries/JournalWallDesktop.webp")',
				}}
			/>

			<main className="relative z-10 mx-auto mt-20 flex w-full max-w-[1200px] flex-1 flex-col gap-5 px-4 py-4 sm:px-6 md:px-10 md:py-5">
				{/* Tabs centred on the row; Add Journal sits in the right column
				    (full width under the tabs on phones). */}
				<div className="flex flex-col gap-3 md:grid md:grid-cols-[1fr_auto_1fr] md:items-center">
					<span aria-hidden className="hidden md:block" />
					<LibraryStoryTabs value={storyTab} onChange={handleStoryTabChange} />
					{/* Journals reach Our Story only by being shared (spec #2). */}
					{storyTab !== "our_story" ? (
						<Button
							type="button"
							onClick={openCreate}
							className="min-h-[44px] shrink-0 rounded-xl px-5 font-medium text-sm leading-[1.4] transition-colors hover:opacity-95 active:scale-[0.98] md:justify-self-end"
						>
							Add Journal
						</Button>
					) : null}
				</div>

				{isLoading ? (
					<div
						className="w-full animate-pulse rounded-[20px]"
						style={{
							backgroundColor: brand.libraryMint,
							minHeight: 600,
						}}
					/>
				) : isEmpty && storyTab === "our_story" ? (
					<OurStoryEmptyState
						onGoToMyStory={() => handleStoryTabChange("my_story")}
					/>
				) : isEmpty ? (
					<LibraryEmptyState onBeginLegacy={openCreate} />
				) : (
					<LibraryJournalGrid
						storyTab={storyTab}
						journals={journals}
						onOpenJournal={handleOpenJournal}
						onAddEntry={handleAddEntry}
					/>
				)}
			</main>

			<div className="relative z-10">
				<DashboardFooter />
			</div>

			<CreateJournalDialog
				open={createOpen}
				onOpenChange={setCreateOpen}
				defaultStoryType={storyTab === "our_story" ? "my_story" : storyTab}
				onCreated={(type) => {
					setStoryTab(type);
					resetOverlays();
				}}
			/>

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
		</>
	);
}
