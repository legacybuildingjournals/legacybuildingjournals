import { api } from "@legacy-building/backend/convex/_generated/api";
import type { Id } from "@legacy-building/backend/convex/_generated/dataModel";
import { brand } from "@legacy-building/ui/lib/brand-journal";
import { cn } from "@legacy-building/ui/lib/utils";
import { useQuery } from "convex/react";
import { ChevronLeft, Pencil, Trash2 } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { DeleteEntryDialog } from "@/components/journal/library/DeleteEntryDialog";
import { EditJournalEntrySidebarForm } from "@/components/journal/library/EditJournalEntrySidebarForm";
import { EntryAudioPlayer } from "@/components/journal/library/EntryAudioPlayer";
import { EntryCoverImage } from "@/components/journal/library/EntryCoverImage";
import {
	sidebarCoverFrameClass,
	sidebarCoverImageClass,
} from "@/components/journal/library/libraryFormStyles";
import { useCollapsingSidebarCover } from "@/components/journal/library/useCollapsingSidebarCover";
import { Button } from "@/components/journal/ui/button";
import { convertWebmToMp4 } from "@/lib/journal/convertToMp4";
import { formatDate } from "@/lib/journal/formatDate";
import {
	type EnrichedJournalEntry,
	entryAccentColor,
} from "@/lib/journal/journalEntryTypes";

type JournalEntryDetailViewProps = {
	entryId: Id<"journalEntries">;
	onBack: () => void;
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
				"size-[30px] shrink-0 rounded bg-white p-[5px] hover:bg-white hover:opacity-80",
				className,
			)}
		>
			{children}
		</Button>
	);
}

export function JournalEntryDetailView({
	entryId,
	onBack,
	onDeleted,
}: JournalEntryDetailViewProps) {
	const [deleteOpen, setDeleteOpen] = useState(false);
	const [editing, setEditing] = useState(false);
	const scrollRef = useRef<HTMLDivElement>(null);
	const coverHeight = useCollapsingSidebarCover(scrollRef, entryId);

	const entry = useQuery(api.journal.entries.queries.getById, { id: entryId });

	// biome-ignore lint/correctness/useExhaustiveDependencies: exit edit mode when viewing a different entry
	useEffect(() => {
		setEditing(false);
	}, [entryId]);

	if (entry === undefined) {
		return (
			<div
				className="flex min-h-0 flex-1 flex-col"
				style={{ backgroundColor: brand.libraryMint }}
			>
				<div className="min-h-[200px] animate-pulse bg-white" />
				<div className="flex-1 animate-pulse bg-[#ebf6f6]" />
			</div>
		);
	}

	if (entry === null) {
		return (
			<div
				className="flex flex-1 flex-col items-center justify-center gap-3 p-6"
				style={{ backgroundColor: brand.libraryMint }}
			>
				<p className="text-[#525252] text-sm">Entry not found</p>
				<Button
					type="button"
					variant="link"
					onClick={onBack}
					className="h-auto p-0 font-medium text-[#008080] text-sm"
				>
					Back to journal
				</Button>
			</div>
		);
	}

	const enriched = entry as EnrichedJournalEntry;

	if (editing) {
		return (
			<EditJournalEntrySidebarForm
				entry={enriched}
				onCancel={() => setEditing(false)}
				onSaved={() => setEditing(false)}
			/>
		);
	}

	const accent = entryAccentColor(enriched.mode);
	const isRecording = enriched.mode === "recording";
	const isVideo = enriched.mode === "video";

	const handleDownloadAudio = async () => {
		if (!enriched.audioUrl) return;
		try {
			const res = await fetch(enriched.audioUrl);
			const webmBlob = await res.blob();
			const mp4Blob = await convertWebmToMp4(webmBlob);
			const url = URL.createObjectURL(mp4Blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `${enriched.title || "recording"}.mp4`;
			a.click();
			URL.revokeObjectURL(url);
		} catch {
			window.open(enriched.audioUrl, "_blank");
		}
	};

	return (
		<>
			<div
				className="flex min-h-0 flex-1 flex-col overflow-hidden"
				style={{ backgroundColor: brand.libraryMint }}
			>
				<div
					ref={scrollRef}
					className="library-modal-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain"
					style={{ backgroundColor: brand.libraryMint }}
				>
					<div
						className={sidebarCoverFrameClass}
						style={{ height: coverHeight }}
					>
						<EntryCoverImage
							imageId={enriched.imageId}
							imageUrl={enriched.imageUrl}
							className={sidebarCoverImageClass}
						/>
						<SidebarIconButton
							ariaLabel="Back to entries"
							onClick={onBack}
							className="absolute top-2.5 left-2.5 bg-white"
						>
							<ChevronLeft
								className="size-5"
								style={{ color: accent }}
								strokeWidth={2}
							/>
						</SidebarIconButton>
					</div>

					<div className="flex flex-col gap-2 p-5">
						<div className="flex items-start justify-between gap-2">
							<h3 className="min-w-0 flex-1 font-semibold text-[#1a1a1a] text-base leading-[1.4]">
								{enriched.title}
							</h3>
							<div className="flex shrink-0">
								<SidebarIconButton
									ariaLabel="Edit entry"
									onClick={() => setEditing(true)}
									className="bg-transparent"
								>
									<Pencil
										className="size-5"
										style={{ color: accent }}
										strokeWidth={2}
									/>
								</SidebarIconButton>
								<SidebarIconButton
									ariaLabel="Delete entry"
									onClick={() => setDeleteOpen(true)}
									className="bg-transparent"
								>
									<Trash2
										className="size-5"
										style={{ color: brand.destructive }}
										strokeWidth={2}
									/>
								</SidebarIconButton>
							</div>
						</div>

						<p
							className="font-normal text-sm leading-none"
							style={{ color: brand.sidebarDateMuted }}
						>
							{formatDate(enriched.dateMs)}
						</p>

						{isRecording && enriched.audioUrl ? (
							<EntryAudioPlayer
								src={enriched.audioUrl}
								accentColor={accent}
								className="py-1"
							/>
						) : null}

						{isVideo && enriched.videoUrl ? (
							// biome-ignore lint/a11y/useMediaCaption: user-supplied journal footage has no caption track
							<video
								src={enriched.videoUrl}
								controls
								poster={enriched.imageUrl}
								className="w-full rounded-[12px] bg-black"
							/>
						) : null}

						<div className="pt-2">
							{enriched.mode === "writing" && enriched.body ? (
								<p className="whitespace-pre-wrap font-normal text-[#1a1a1a] text-sm leading-[1.4]">
									{enriched.body}
								</p>
							) : enriched.mode === "writing" ? (
								<p className="text-[#8a8a8a] text-sm">No entry text</p>
							) : null}
						</div>

						{isRecording && enriched.audioUrl ? (
							<Button
								type="button"
								variant="link"
								onClick={() => void handleDownloadAudio()}
								className="h-auto self-start p-0 font-medium text-sm underline-offset-2"
								style={{ color: accent }}
							>
								Download audio
							</Button>
						) : null}
					</div>
				</div>
			</div>

			<DeleteEntryDialog
				entryId={entryId}
				entryTitle={enriched.title}
				open={deleteOpen}
				onOpenChange={setDeleteOpen}
				onDeleted={() => {
					onDeleted?.();
					onBack();
				}}
			/>
		</>
	);
}
