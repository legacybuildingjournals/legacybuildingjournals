import { api } from "@legacy-building/backend/convex/_generated/api";
import type { Id } from "@legacy-building/backend/convex/_generated/dataModel";
import { brand } from "@legacy-building/ui/lib/brand-journal";
import { cn } from "@legacy-building/ui/lib/utils";
import { useAction, useQuery } from "convex/react";
import { Pencil, Share, Trash2, X } from "lucide-react";
import {
	type ReactNode,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { createPortal } from "react-dom";
import { DeleteJournalDialog } from "@/components/journal/library/DeleteJournalDialog";
import { EditJournalDialog } from "@/components/journal/library/EditJournalDialog";
import { JournalCoverImage } from "@/components/journal/library/JournalCoverImage";
import { JournalEntryDetailView } from "@/components/journal/library/JournalEntryDetailView";
import { JournalEntryRow } from "@/components/journal/library/JournalEntryRow";
import { JournalExportFooter } from "@/components/journal/library/JournalExportFooter";
import { JournalSidebarWaitOverlay } from "@/components/journal/library/JournalSidebarWaitOverlay";
import { useCollapsingSidebarCover } from "@/components/journal/library/useCollapsingSidebarCover";
import { Button } from "@/components/journal/ui/button";
import { Checkbox } from "@/components/journal/ui/checkbox";
import {
	MIN_BOOK_ORDER_ENTRIES,
	minimumBookOrderMessage,
} from "@/lib/journal/bookOrder";
import { exportJournalEntriesToPdf } from "@/lib/journal/exportJournalPdf";
import { formatDate } from "@/lib/journal/formatDate";
import type { EnrichedJournalEntry } from "@/lib/journal/journalEntryTypes";
import {
	toastBubbleMessage,
	toastMutationError,
	toastMutationSuccess,
} from "@/lib/journal/toast";

type JournalDetailSheetProps = {
	journalId: Id<"journals"> | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onDeleted?: () => void;
};

function SidebarIconButton({
	children,
	onClick,
	className,
	ariaLabel,
}: {
	children: ReactNode;
	onClick?: () => void;
	className?: string;
	ariaLabel: string;
}) {
	return (
		<Button
			type="button"
			variant="ghost"
			size="icon"
			onClick={onClick}
			aria-label={ariaLabel}
			className={cn(
				"flex size-[30px] max-h-[30px] min-h-[30px] min-w-[30px] max-w-[30px] shrink-0 self-start rounded-[4px] p-[5px] hover:bg-transparent hover:opacity-80",
				className,
			)}
		>
			{children}
		</Button>
	);
}

export function JournalDetailSheet({
	journalId,
	open,
	onOpenChange,
	onDeleted,
}: JournalDetailSheetProps) {
	const [deleteOpen, setDeleteOpen] = useState(false);
	const [journalEditing, setJournalEditing] = useState(false);
	const [selectedEntryId, setSelectedEntryId] =
		useState<Id<"journalEntries"> | null>(null);
	const [exportMode, setExportMode] = useState(false);
	const [selectedEntryIds, setSelectedEntryIds] = useState<
		Set<Id<"journalEntries">>
	>(() => new Set());
	const [exporting, setExporting] = useState(false);
	const [ordering, setOrdering] = useState(false);
	const [exportError, setExportError] = useState<string | null>(null);
	const createBookOrderCheckout = useAction(
		api.journal.actions.createBookOrderCheckout,
	);
	const [mounted, setMounted] = useState(false);

	const journal = useQuery(
		api.journal.queries.getById,
		open && journalId ? { id: journalId } : "skip",
	);
	const entries = useQuery(
		api.journal.entries.queries.listByJournal,
		open && journalId ? { journalId } : "skip",
	);

	const enrichedEntries = useMemo(
		() => (entries ?? []) as EnrichedJournalEntry[],
		[entries],
	);

	/** Only writing entries can be exported to PDF (no audio) */
	const exportableEntries = useMemo(
		() => enrichedEntries.filter((entry) => entry.mode === "writing"),
		[enrichedEntries],
	);

	const allExportableSelected =
		exportableEntries.length > 0 &&
		exportableEntries.every((entry) => selectedEntryIds.has(entry._id));

	const entriesToShow = exportMode ? exportableEntries : enrichedEntries;

	const isExportBusy = exporting || ordering;
	const isExportBusyRef = useRef(isExportBusy);
	isExportBusyRef.current = isExportBusy;
	const scrollRef = useRef<HTMLDivElement>(null);
	const coverHeight = useCollapsingSidebarCover(
		scrollRef,
		open && journalId ? journalId : null,
	);

	const handleClose = useCallback(() => {
		if (exporting || ordering) return;
		onOpenChange(false);
	}, [onOpenChange, exporting, ordering]);

	const exitExportMode = useCallback(() => {
		setExportMode(false);
		setExportError(null);
		setOrdering(false);
		setSelectedEntryIds(new Set());
	}, []);

	const startExportMode = useCallback(() => {
		setExportMode(true);
		setExportError(null);
		setSelectedEntryIds(new Set(exportableEntries.map((entry) => entry._id)));
	}, [exportableEntries]);

	const toggleJournalMaster = useCallback(() => {
		if (allExportableSelected) {
			setSelectedEntryIds(new Set());
		} else {
			setSelectedEntryIds(new Set(exportableEntries.map((entry) => entry._id)));
		}
	}, [allExportableSelected, exportableEntries]);

	useEffect(() => {
		setMounted(true);
	}, []);

	useEffect(() => {
		if (!open) {
			setSelectedEntryId(null);
			setJournalEditing(false);
			exitExportMode();
		}
	}, [open, exitExportMode]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: reset sheet when selected journal changes
	useEffect(() => {
		setSelectedEntryId(null);
		setJournalEditing(false);
		exitExportMode();
	}, [journalId, exitExportMode]);

	useEffect(() => {
		if (!exportMode) return;
		const exportableIds = new Set(exportableEntries.map((e) => e._id));
		setSelectedEntryIds((prev) => {
			const next = new Set<Id<"journalEntries">>();
			for (const id of prev) {
				if (exportableIds.has(id)) next.add(id);
			}
			return next;
		});
	}, [exportMode, exportableEntries]);

	const toggleEntrySelection = useCallback((entryId: Id<"journalEntries">) => {
		setSelectedEntryIds((prev) => {
			const next = new Set(prev);
			if (next.has(entryId)) {
				next.delete(entryId);
			} else {
				next.add(entryId);
			}
			return next;
		});
	}, []);

	const canExport = allExportableSelected || selectedEntryIds.size > 0;

	const handleExportPdf = useCallback(async () => {
		if (!journal || !canExport) return;

		const selectedEntries = exportableEntries.filter((entry) =>
			selectedEntryIds.has(entry._id),
		);

		setExporting(true);
		setExportError(null);
		try {
			await exportJournalEntriesToPdf({
				journal: {
					title: journal.title,
					dateMs: journal.dateMs,
					type: journal.type,
					dedication: journal.dedication,
					coverImageUrl: journal.coverImageUrl,
				},
				includeJournal: allExportableSelected,
				entries: selectedEntries,
			});
			toastMutationSuccess("PDF downloaded.");
			exitExportMode();
		} catch (err) {
			const message = "Could not export PDF. Please try again.";
			setExportError(message);
			toastMutationError(err, message);
		} finally {
			setExporting(false);
		}
	}, [
		journal,
		canExport,
		exportableEntries,
		selectedEntryIds,
		allExportableSelected,
		exitExportMode,
	]);

	const handleOrderBook = useCallback(async () => {
		if (!journalId || !journal || !canExport) return;

		const selectedEntries = exportableEntries.filter((entry) =>
			selectedEntryIds.has(entry._id),
		);

		if (selectedEntries.length < MIN_BOOK_ORDER_ENTRIES) {
			toastBubbleMessage(minimumBookOrderMessage(selectedEntries.length));
			return;
		}

		setOrdering(true);
		setExportError(null);
		// Open synchronously on click. Do not pass "noopener" here — it makes
		// window.open return null even when the tab opens successfully.
		const checkoutWindow = window.open("about:blank", "_blank");
		if (!checkoutWindow) {
			setOrdering(false);
			const message =
				"Popup blocked. Allow popups for this site and try again.";
			setExportError(message);
			toastMutationError(new Error(message), message);
			return;
		}
		checkoutWindow.opener = null;
		try {
			const { checkoutUrl } = await createBookOrderCheckout({
				journalId,
				entryIds: selectedEntries.map((entry) => entry._id),
				includeJournal: allExportableSelected,
			});
			checkoutWindow.location.replace(checkoutUrl);
			setOrdering(false);
		} catch (err) {
			checkoutWindow.close();
			const message = "Could not start book checkout. Please try again.";
			setExportError(message);
			toastMutationError(err, message);
			setOrdering(false);
		}
	}, [
		journalId,
		journal,
		canExport,
		exportableEntries,
		selectedEntryIds,
		allExportableSelected,
		createBookOrderCheckout,
	]);

	useEffect(() => {
		if (!open) return;
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				if (journalEditing) {
					setJournalEditing(false);
				} else if (exportMode && !isExportBusyRef.current) {
					exitExportMode();
				} else if (selectedEntryId) {
					setSelectedEntryId(null);
				} else {
					handleClose();
				}
			}
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [
		open,
		handleClose,
		selectedEntryId,
		exportMode,
		exitExportMode,
		journalEditing,
	]);

	if (!mounted) return null;

	const isLoading = open && journal === undefined;
	const loadedJournal = journal ?? null;

	return (
		<>
			{createPortal(
				<>
					<button
						type="button"
						aria-label="Close journal details"
						tabIndex={-1}
						className={cn(
							"fixed inset-0 z-[1505] border-0 bg-foreground/60 p-0 backdrop-blur-none transition-opacity duration-200",
							open
								? "opacity-100 backdrop-blur-sm"
								: "pointer-events-none opacity-0",
						)}
						onClick={open ? handleClose : undefined}
					/>
					<aside
						role="dialog"
						aria-modal="true"
						aria-label={
							loadedJournal
								? `Journal: ${loadedJournal.title}`
								: "Journal details"
						}
						className={cn(
							"fixed inset-y-0 right-0 z-[1506] flex flex-col",
							"w-full max-w-none md:max-w-[400px]",
							"transition-transform duration-200 ease-in-out",
							open ? "translate-x-0" : "pointer-events-none translate-x-full",
						)}
						style={{
							backgroundColor:
								selectedEntryId && !exportMode
									? brand.libraryMint
									: brand.librarySidebarBg,
						}}
					>
						{open ? (
							selectedEntryId && !exportMode ? (
								<JournalEntryDetailView
									entryId={selectedEntryId}
									onBack={() => setSelectedEntryId(null)}
								/>
							) : (
								<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
									<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
										<div
											ref={scrollRef}
											className="library-modal-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain"
										>
											<div
												className="relative sticky top-0 z-[2] flex w-full shrink-0 items-center justify-center overflow-hidden bg-white p-3"
												style={{ height: coverHeight }}
											>
												<div className="relative flex size-full items-center justify-center">
													{isLoading ? (
														<div className="size-full animate-pulse bg-[#f2f2f2]" />
													) : loadedJournal ? (
														<JournalCoverImage
															coverImageId={loadedJournal.coverImageId}
															coverImageUrl={loadedJournal.coverImageUrl}
															className="max-h-full max-w-full"
														/>
													) : null}
												</div>
												<SidebarIconButton
													ariaLabel="Close journal"
													onClick={handleClose}
													className="absolute top-2.5 left-2.5 z-[3] cursor-pointer bg-white hover:bg-white"
												>
													<X
														className="size-full"
														style={{ color: brand.primary }}
														strokeWidth={2}
													/>
												</SidebarIconButton>
											</div>

											<div className="py-5">
												<div className="flex shrink-0 flex-col gap-1.5 px-3">
													<div className="flex items-start justify-between gap-2">
														<div className="flex min-w-0 flex-1 items-center gap-1.5">
															{exportMode ? (
																<Checkbox
																	checked={allExportableSelected}
																	onCheckedChange={() => toggleJournalMaster()}
																	aria-label="Select all entries for export"
																	className="size-5 shrink-0"
																/>
															) : null}
															<h2 className="min-w-0 font-semibold text-[#1a1a1a] text-base leading-[1.4]">
																{isLoading
																	? "…"
																	: loadedJournal
																		? loadedJournal.title
																		: "Journal not found"}
															</h2>
														</div>
														{loadedJournal ? (
															<div className="flex shrink-0 flex-row items-center">
																{exportMode ? (
																	<>
																		<SidebarIconButton
																			ariaLabel="Cancel export"
																			onClick={exitExportMode}
																		>
																			<X
																				className="size-5"
																				style={{
																					color: brand.sidebarDateMuted,
																				}}
																				strokeWidth={2}
																			/>
																		</SidebarIconButton>
																		<SidebarIconButton
																			ariaLabel="Delete journal"
																			onClick={() => setDeleteOpen(true)}
																		>
																			<Trash2
																				className="size-5"
																				style={{ color: brand.destructive }}
																				strokeWidth={2}
																			/>
																		</SidebarIconButton>
																	</>
																) : (
																	<>
																		<SidebarIconButton
																			ariaLabel="Export journal to PDF"
																			onClick={startExportMode}
																		>
																			<Share
																				className="size-5"
																				style={{ color: brand.primary }}
																				strokeWidth={2}
																			/>
																		</SidebarIconButton>
																		<SidebarIconButton
																			ariaLabel="Edit journal"
																			onClick={() => setJournalEditing(true)}
																		>
																			<Pencil
																				className="size-5"
																				style={{ color: brand.primary }}
																				strokeWidth={2}
																			/>
																		</SidebarIconButton>
																		<SidebarIconButton
																			ariaLabel="Delete journal"
																			onClick={() => setDeleteOpen(true)}
																		>
																			<Trash2
																				className="size-5"
																				style={{ color: brand.destructive }}
																				strokeWidth={2}
																			/>
																		</SidebarIconButton>
																	</>
																)}
															</div>
														) : null}
													</div>
													{loadedJournal ? (
														<>
															<p
																className={cn(
																	"font-normal text-sm leading-none",
																	exportMode && "pl-6",
																)}
																style={{ color: brand.sidebarDateMuted }}
															>
																{formatDate(loadedJournal.dateMs)}
															</p>
															{loadedJournal.dedication?.trim() ? (
																<p
																	className={cn(
																		"whitespace-pre-wrap font-normal text-[#525252] text-sm leading-[1.4]",
																		exportMode && "pl-6",
																	)}
																>
																	{loadedJournal.dedication}
																</p>
															) : null}
														</>
													) : null}
												</div>

												<div className="mt-3">
													{entries === undefined ? (
														<div className="mx-3 h-24 animate-pulse rounded bg-[#ececec]" />
													) : entriesToShow.length === 0 ? (
														<div className="px-3 py-6 text-center text-[#525252] text-sm">
															{exportMode && enrichedEntries.length > 0
																? "Recording entries are not included in PDF export."
																: null}
														</div>
													) : (
														<div className="flex flex-col">
															{entriesToShow.map((entry) => (
																<JournalEntryRow
																	key={entry._id}
																	entry={entry}
																	selectionMode={exportMode}
																	selected={selectedEntryIds.has(entry._id)}
																	onToggleSelect={() =>
																		toggleEntrySelection(entry._id)
																	}
																	onOpen={() => setSelectedEntryId(entry._id)}
																/>
															))}
														</div>
													)}
												</div>

												{exportError ? (
													<p
														className="px-3 pt-2 text-[#b0200c] text-sm"
														role="alert"
													>
														{exportError}
													</p>
												) : null}
											</div>
										</div>

										{exportMode ? (
											<JournalExportFooter
												exporting={exporting}
												ordering={ordering}
												disabled={!canExport}
												onExport={() => void handleExportPdf()}
												onOrderBook={() => void handleOrderBook()}
											/>
										) : null}
									</div>
								</div>
							)
						) : null}
						{isExportBusy ? (
							<JournalSidebarWaitOverlay
								message={
									exporting
										? "Preparing your PDF. Please wait…"
										: "Preparing checkout. Please wait…"
								}
							/>
						) : null}
					</aside>
				</>,
				document.body,
			)}

			<EditJournalDialog
				journal={loadedJournal}
				open={journalEditing && loadedJournal !== null}
				onOpenChange={setJournalEditing}
			/>

			<DeleteJournalDialog
				journalId={journalId}
				journalTitle={journal?.title}
				open={deleteOpen}
				onOpenChange={setDeleteOpen}
				onDeleted={() => {
					onDeleted?.();
					handleClose();
				}}
			/>
		</>
	);
}
