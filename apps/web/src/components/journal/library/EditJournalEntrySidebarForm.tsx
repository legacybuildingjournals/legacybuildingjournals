import { api } from "@legacy-building/backend/convex/_generated/api";
import type {
	Doc,
	Id,
} from "@legacy-building/backend/convex/_generated/dataModel";
import { brand } from "@legacy-building/ui/lib/brand-journal";
import { cn } from "@legacy-building/ui/lib/utils";
import { useMutation, useQuery } from "convex/react";
import { ChevronLeft } from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { AudioRecorderField } from "@/components/journal/library/AudioRecorderField";
import { DateField } from "@/components/journal/library/DateField";
import { EntryImageUpload } from "@/components/journal/library/EntryImageUpload";
import {
	bubbleCreateButtonClass,
	bubbleDownloadButtonClass,
	bubbleFieldStack,
	bubbleInputClass,
	bubbleLabelClass,
	bubbleRowGap24,
	bubbleSelectContentClass,
	bubbleSelectItemClass,
	bubbleSelectTriggerClass,
	bubbleTextareaClass,
} from "@/components/journal/library/libraryFormStyles";
import { Button } from "@/components/journal/ui/button";
import { Input } from "@/components/journal/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/journal/ui/select";
import { Textarea } from "@/components/journal/ui/textarea";
import { compressImageFile } from "@/lib/journal/compressImageFile";
import {
	type EnrichedJournalEntry,
	entryAccentColor,
} from "@/lib/journal/journalEntryTypes";
import {
	messageFromUnknownError,
	toastMutationError,
	toastMutationSuccess,
} from "@/lib/journal/toast";
import { uploadToStorage } from "@/lib/journal/uploadToStorage";

type JournalWithCover = Doc<"journals"> & { coverImageUrl?: string };

type EditJournalEntrySidebarFormProps = {
	entry: EnrichedJournalEntry;
	onCancel: () => void;
	onSaved?: () => void;
};

export function EditJournalEntrySidebarForm({
	entry,
	onCancel,
	onSaved,
}: EditJournalEntrySidebarFormProps) {
	const formId = useId();
	const updateEntry = useMutation(api.journal.entries.mutations.update);
	const generateUploadUrl = useMutation(
		api.journal.mutations.generateUploadUrl,
	);

	const allJournals = useQuery(api.journal.queries.listByType, {});
	const preselectedJournal = useQuery(api.journal.queries.getById, {
		id: entry.journalId,
	});

	const journalOptions = useMemo((): JournalWithCover[] => {
		const list = (allJournals ?? []) as JournalWithCover[];
		if (
			preselectedJournal &&
			!list.some((journal) => journal._id === preselectedJournal._id)
		) {
			return [preselectedJournal as JournalWithCover, ...list];
		}
		return list;
	}, [allJournals, preselectedJournal]);

	const isRecording = entry.mode === "recording";
	const accent = entryAccentColor(entry.mode);

	const [title, setTitle] = useState(entry.title);
	const [date, setDate] = useState<Date>(() => new Date(entry.dateMs));
	const [body, setBody] = useState(entry.body ?? "");
	const [selectedJournalId, setSelectedJournalId] = useState<Id<"journals">>(
		entry.journalId,
	);
	const [imageFile, setImageFile] = useState<File | null>(null);
	const [imagePreview, setImagePreview] = useState<string | null>(
		entry.imageUrl ?? null,
	);
	const [audioFile, setAudioFile] = useState<File | null>(null);
	const [existingAudioCleared, setExistingAudioCleared] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [showErrors, setShowErrors] = useState(false);

	useEffect(() => {
		setTitle(entry.title);
		setDate(new Date(entry.dateMs));
		setBody(entry.body ?? "");
		setSelectedJournalId(entry.journalId);
		setImageFile(null);
		setImagePreview(entry.imageUrl ?? null);
		setAudioFile(null);
		setExistingAudioCleared(false);
		setError(null);
		setShowErrors(false);
	}, [entry.title, entry.dateMs, entry.body, entry.journalId, entry.imageUrl]);

	const titleInvalid = !title.trim();
	const dateInvalid = Number.isNaN(date.getTime());
	const bodyInvalid = !isRecording && !body.trim();
	const hasExistingAudio = Boolean(entry.audioUrl) && !existingAudioCleared;
	const audioInvalid = isRecording && audioFile === null && !hasExistingAudio;
	const imageInvalid = imageFile === null && !imagePreview;
	const journalInvalid = selectedJournalId === null;

	const isValid =
		!titleInvalid &&
		!dateInvalid &&
		!imageInvalid &&
		!journalInvalid &&
		(isRecording ? !audioInvalid : !bodyInvalid);

	const handleCancel = useCallback(() => {
		if (imagePreview?.startsWith("blob:")) {
			URL.revokeObjectURL(imagePreview);
		}
		onCancel();
	}, [onCancel, imagePreview]);

	useEffect(() => {
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") handleCancel();
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [handleCancel]);

	const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const raw = e.target.files?.[0];
		if (!raw) return;
		const file = await compressImageFile(raw);
		if (imagePreview?.startsWith("blob:")) {
			URL.revokeObjectURL(imagePreview);
		}
		setImageFile(file);
		setImagePreview(URL.createObjectURL(file));
	};

	const handleDownload = () => {
		if (!isRecording && body.trim()) {
			const blob = new Blob([body], { type: "text/plain" });
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `${title.trim() || "entry"}.txt`;
			a.click();
			URL.revokeObjectURL(url);
			return;
		}
		if (isRecording && audioFile) {
			const url = URL.createObjectURL(audioFile);
			const a = document.createElement("a");
			a.href = url;
			a.download = audioFile.name;
			a.click();
			URL.revokeObjectURL(url);
			return;
		}
		if (isRecording && hasExistingAudio && entry.audioUrl) {
			void fetch(entry.audioUrl)
				.then((res) => res.blob())
				.then((blob) => {
					const url = URL.createObjectURL(blob);
					const a = document.createElement("a");
					a.href = url;
					a.download = `${title.trim() || "recording"}.webm`;
					a.click();
					URL.revokeObjectURL(url);
				})
				.catch(() => window.open(entry.audioUrl, "_blank"));
		}
	};

	const handleUpdate = async () => {
		setShowErrors(true);
		if (!isValid || !selectedJournalId) return;

		setSubmitting(true);
		setError(null);
		try {
			let imageId: Id<"_storage"> | undefined;
			if (imageFile) {
				imageId = await uploadToStorage(
					imageFile,
					() => generateUploadUrl(),
					imageFile.type || "image/jpeg",
				);
			}

			let audioId: Id<"_storage"> | undefined;
			if (isRecording && audioFile) {
				audioId = await uploadToStorage(
					audioFile,
					() => generateUploadUrl(),
					audioFile.type || "audio/webm",
				);
			}

			await updateEntry({
				id: entry._id,
				journalId: selectedJournalId,
				title: title.trim(),
				dateMs: date.getTime(),
				body: isRecording ? undefined : body.trim(),
				imageId,
				audioId,
			});

			toastMutationSuccess("Entry updated.");
			onSaved?.();
			handleCancel();
		} catch (err) {
			const message = messageFromUnknownError(
				err,
				"Could not update entry. Please try again.",
			);
			setError(message);
			toastMutationError(err, message);
		} finally {
			setSubmitting(false);
		}
	};

	const downloadBtnClass = isRecording
		? cn(bubbleDownloadButtonClass, "border-[#dca114] text-[#dca114]")
		: bubbleDownloadButtonClass;

	return (
		<form
			id={formId}
			className="flex min-h-0 flex-1 flex-col overflow-hidden"
			style={{ backgroundColor: brand.libraryMint }}
			onSubmit={(e) => {
				e.preventDefault();
				void handleUpdate();
			}}
		>
			<div className="library-modal-scroll flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto overscroll-contain px-3 py-4">
				<div className="flex items-center gap-2.5">
					<Button
						type="button"
						variant="ghost"
						size="icon"
						onClick={handleCancel}
						className="size-[30px] shrink-0 rounded bg-white p-[5px] hover:bg-white hover:opacity-80"
						aria-label="Back to entry"
					>
						<ChevronLeft
							className="size-5"
							style={{ color: brand.textMuted }}
							strokeWidth={2}
						/>
					</Button>
					<h2 className="font-semibold text-[#1a1a1a] text-base leading-[1.4]">
						{isRecording ? "Edit your recording" : "Edit your story"}
					</h2>
				</div>

				<div
					className={cn(
						"grid w-full grid-cols-1 sm:grid-cols-2",
						bubbleRowGap24,
					)}
				>
					<div className={bubbleFieldStack}>
						<label htmlFor={`${formId}-title`} className={bubbleLabelClass}>
							Title
						</label>
						<Input
							id={`${formId}-title`}
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							className={bubbleInputClass(showErrors && titleInvalid)}
							aria-invalid={showErrors && titleInvalid}
						/>
					</div>
					<div className={bubbleFieldStack}>
						<span className={bubbleLabelClass}>Date</span>
						<DateField
							value={date}
							onChange={(value) => value && setDate(value)}
							invalid={showErrors && dateInvalid}
							popoverClassName="z-[1600]"
							className={cn(showErrors && dateInvalid && "border-[#b0200c]")}
						/>
					</div>
				</div>

				{isRecording ? (
					<div className={bubbleFieldStack}>
						<AudioRecorderField
							accentColor={accent}
							value={audioFile}
							onChange={setAudioFile}
							existingAudioUrl={hasExistingAudio ? entry.audioUrl : null}
							onExistingAudioClear={() => setExistingAudioCleared(true)}
							invalid={showErrors && audioInvalid}
						/>
					</div>
				) : (
					<div className={bubbleFieldStack}>
						<label htmlFor={`${formId}-body`} className={bubbleLabelClass}>
							Entry Log
						</label>
						<Textarea
							id={`${formId}-body`}
							value={body}
							onChange={(e) => setBody(e.target.value)}
							className={bubbleTextareaClass(showErrors && bodyInvalid)}
							aria-invalid={showErrors && bodyInvalid}
						/>
					</div>
				)}

				<div className={bubbleFieldStack}>
					<span className={bubbleLabelClass}>Select a journal</span>
					<Select
						key={`${selectedJournalId}-${journalOptions.length}`}
						value={selectedJournalId}
						onValueChange={(value) =>
							setSelectedJournalId(value as Id<"journals">)
						}
					>
						<SelectTrigger
							aria-label="Journal"
							className={bubbleSelectTriggerClass(showErrors && journalInvalid)}
						>
							<SelectValue placeholder="Select a journal" />
						</SelectTrigger>
						<SelectContent
							position="popper"
							align="start"
							sideOffset={6}
							className={bubbleSelectContentClass}
						>
							{journalOptions.map((journal) => (
								<SelectItem
									key={journal._id}
									value={journal._id}
									className={bubbleSelectItemClass}
								>
									{journal.title}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				<div className={bubbleFieldStack}>
					<span className={bubbleLabelClass}>Update image</span>
					<EntryImageUpload
						accentColor={accent}
						imagePreview={imagePreview}
						invalid={showErrors && imageInvalid}
						fullWidth
						onFileChange={handleImageChange}
					/>
				</div>

				{showErrors && !isValid ? (
					<p className="text-[#b0200c] text-sm" role="alert">
						Please fill in all fields before updating your entry.
					</p>
				) : null}

				{error ? (
					<p className="text-[#b0200c] text-sm" role="alert">
						{error}
					</p>
				) : null}

				<div className="flex w-full gap-6 pb-2">
					<Button
						type="button"
						onClick={handleDownload}
						className={downloadBtnClass}
					>
						Download
					</Button>
					<Button
						type="submit"
						disabled={submitting}
						className={cn(
							bubbleCreateButtonClass,
							isRecording && "bg-[#dca114]",
						)}
						style={isRecording ? undefined : { backgroundColor: brand.primary }}
					>
						{submitting ? "Updating…" : "Update"}
					</Button>
				</div>
			</div>
		</form>
	);
}
