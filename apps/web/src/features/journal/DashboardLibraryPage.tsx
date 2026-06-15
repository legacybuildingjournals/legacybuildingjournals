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
import { DEFAULT_STORY_TAB, type StoryTab } from "@/lib/journal/journalTypes";
import { readLibraryLocationState } from "@/lib/journal/libraryNavigation";

export function DashboardLibraryPage() {
	const navigate = useNavigate();
	const { guardJournalAction, hasPaidAccess } = useJournalPaywall();
	const locationState = useRouterState({
		select: (s: RouterState) => s.location.state,
	});
	const [storyTab, setStoryTab] = useState<StoryTab>(DEFAULT_STORY_TAB);
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
			if (nav.openAddEntry) {
				guardJournalAction(() => {
					setSelectedJournalId(null);
					setEntryPanelJournalId(nav.journalId ?? null);
					setEntryPanelOpen(true);
					void navigate({ replace: true, state: {} });
				});
			} else {
				guardJournalAction(() => {
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
		(tab: StoryTab) => {
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
			guardJournalAction(() => setSelectedJournalId(journal._id));
		},
		[guardJournalAction],
	);

	const handleAddEntry = useCallback(
		(journal: Doc<"journals">) => {
			guardJournalAction(() => {
				setSelectedJournalId(null);
				setEntryPanelJournalId(journal._id);
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

	const isLoading = journals === undefined;
	const isEmpty = journals !== undefined && journals.length === 0;

	return (
		<>
			<main className="mx-auto mt-20 flex w-full max-w-[1200px] flex-1 flex-col gap-5 px-4 py-4 sm:px-6 md:px-10 md:py-5">
				<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<LibraryStoryTabs value={storyTab} onChange={handleStoryTabChange} />
					<Button
						type="button"
						onClick={openCreate}
						className="min-h-[44px] shrink-0 rounded-xl px-5 font-medium text-sm leading-[1.4] hover:opacity-95"
					>
						Add Journal
					</Button>
				</div>

				{isLoading ? (
					<div
						className="w-full animate-pulse rounded-[20px]"
						style={{
							backgroundColor: brand.libraryMint,
							minHeight: 600,
						}}
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

			<DashboardFooter />

			<CreateJournalDialog
				open={createOpen}
				onOpenChange={setCreateOpen}
				defaultStoryType={storyTab}
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
