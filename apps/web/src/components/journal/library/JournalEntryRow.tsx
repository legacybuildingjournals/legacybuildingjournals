import { Download, Mic } from "lucide-react";

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
	const showDownload =
		!selectionMode &&
		((isRecording && entry.audioUrl) || (!isRecording && entry.imageUrl));

	const handleDownload = (e: React.MouseEvent) => {
		e.stopPropagation();
		if (isRecording && entry.audioUrl) {
			void downloadUrl(entry.audioUrl, `${entry.title || "recording"}.webm`);
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
			className="my-1.5 flex min-h-[60px] w-full cursor-pointer flex-row overflow-visible bg-white"
			style={{ borderLeft: `5px solid ${accent}` }}
		>
			{selectionMode ? (
				<div className="flex items-center self-stretch py-3 pl-1.5">
					<Checkbox
						checked={selected}
						onCheckedChange={() => onToggleSelect?.()}
						onClick={(e) => e.stopPropagation()}
						aria-label={`Select ${entry.title}`}
						className="ml-1.5 size-5"
					/>
				</div>
			) : null}
			<div
				className={
					selectionMode
						? "flex min-w-0 flex-1 flex-col justify-center gap-1 py-3 pl-1.5"
						: "flex min-w-0 flex-1 flex-col justify-center gap-1 py-3 pl-3"
				}
			>
				<span className="truncate text-left font-semibold text-[#1a1a1a] text-sm leading-[1.4]">
					{entry.title || "Untitled entry"}
				</span>
				<span
					className="text-left font-normal text-xs leading-none"
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
				className="flex min-w-[40px] max-w-[20%] flex-1 items-center justify-center self-stretch"
				style={{
					backgroundColor: accent,
					borderRadius: "50px 0 0 50px",
					borderLeft: "1px solid #6b6b6b",
				}}
			>
				{isRecording ? (
					<Mic
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
