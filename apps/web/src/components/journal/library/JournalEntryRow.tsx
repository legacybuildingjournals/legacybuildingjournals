import { Download, Mic, Video as VideoIcon } from "lucide-react";

const PHOSPHOR_SPRITE = "/static/icon_libraries/phosphor-2.1.0-regular.svg";

function PhosphorBookOpenTextIcon({ className }: { className?: string }) {
	return (
		<svg
			viewBox="0 0 32 32"
			data-icon-set="phosphor"
			className={className}
			fill="currentColor"
			aria-hidden="true"
		>
			<title>Journal entry</title>
			<use width={32} height={32} href={`${PHOSPHOR_SPRITE}#book-open-text`} />
		</svg>
	);
}

import { Button } from "@/components/journal/ui/button";
import { Checkbox } from "@/components/journal/ui/checkbox";
import { formatDate } from "@/lib/journal/formatDate";
import {
	type EnrichedJournalEntry,
	entryAccentColor,
} from "@/lib/journal/journalEntryTypes";

type JournalEntryRowProps = {
	entry: EnrichedJournalEntry;
	onOpen?: () => void;
	selectionMode?: boolean;
	selected?: boolean;
	onToggleSelect?: () => void;
};

async function downloadUrl(url: string, filename: string) {
	try {
		const res = await fetch(url);
		const blob = await res.blob();
		const objectUrl = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = objectUrl;
		a.download = filename;
		a.click();
		URL.revokeObjectURL(objectUrl);
	} catch {
		window.open(url, "_blank");
	}
}

export function JournalEntryRow({
	entry,
	onOpen,
	selectionMode = false,
	selected = false,
	onToggleSelect,
}: JournalEntryRowProps) {
	const accent = entryAccentColor(entry.mode);
	const isRecording = entry.mode === "recording";
	const isVideo = entry.mode === "video";
	const showDownload =
		!selectionMode &&
		((isRecording && entry.audioUrl) ||
			(isVideo && entry.videoUrl) ||
			(!isRecording && !isVideo && entry.imageUrl));

	const handleDownload = (e: React.MouseEvent) => {
		e.stopPropagation();
		if (isRecording && entry.audioUrl) {
			void downloadUrl(entry.audioUrl, `${entry.title || "recording"}.webm`);
		} else if (isVideo && entry.videoUrl) {
			void downloadUrl(entry.videoUrl, `${entry.title || "video"}.mp4`);
		} else if (entry.imageUrl) {
			void downloadUrl(entry.imageUrl, `${entry.title || "entry"}.jpg`);
		}
	};

	const handleRowActivate = () => {
		if (selectionMode) {
			onToggleSelect?.();
			return;
		}
		onOpen?.();
	};

	return (
		// biome-ignore lint/a11y/useSemanticElements: row contains nested buttons (download, checkbox)
		<div
			role="button"
			tabIndex={0}
			onClick={handleRowActivate}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					handleRowActivate();
				}
			}}
			className="my-1.5 flex min-h-[68px] w-full cursor-pointer flex-row items-stretch rounded-2xl border border-[#eef0f0] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition-all hover:shadow-md active:scale-[0.99]"
		>
			{selectionMode ? (
				<div className="flex items-center self-stretch py-3 pl-3">
					<Checkbox
						checked={selected}
						onCheckedChange={() => onToggleSelect?.()}
						onClick={(e) => e.stopPropagation()}
						aria-label={`Select ${entry.title}`}
						className="size-5"
					/>
				</div>
			) : null}
			<div className="flex min-w-0 flex-1 flex-col justify-center gap-1 py-3 pl-3">
				<span className="truncate text-left font-semibold text-[#1a1a1a] text-base leading-[1.4]">
					{entry.title || "Untitled entry"}
				</span>
				<span
					className="text-left font-normal text-sm leading-none"
					style={{ color: "#a6a6a6" }}
				>
					{formatDate(entry.dateMs)}
				</span>
			</div>
			{showDownload ? (
				<Button
					type="button"
					variant="ghost"
					size="icon"
					onClick={handleDownload}
					className="w-10 shrink-0 self-center hover:bg-transparent"
					aria-label="Download entry"
				>
					<Download
						className="size-5"
						style={{ color: accent }}
						strokeWidth={2}
					/>
				</Button>
			) : null}
			<div
				className="flex w-16 shrink-0 items-center justify-center self-stretch"
				style={{
					backgroundColor: accent,
					borderRadius: "999px 0 0 999px",
				}}
			>
				{isRecording ? (
					<Mic
						className="size-5 shrink-0 text-white"
						strokeWidth={2}
						aria-hidden
					/>
				) : isVideo ? (
					<VideoIcon
						className="size-5 shrink-0 text-white"
						strokeWidth={2}
						aria-hidden
					/>
				) : (
					<PhosphorBookOpenTextIcon className="size-6 shrink-0 text-white" />
				)}
			</div>
		</div>
	);
}
