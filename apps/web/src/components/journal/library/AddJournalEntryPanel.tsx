import { api } from "@legacy-building/backend/convex/_generated/api";
import type {
	Doc,
	Id,
} from "@legacy-building/backend/convex/_generated/dataModel";
import { brand, dashboardLayout } from "@legacy-building/ui/lib/brand-journal";
import { cn } from "@legacy-building/ui/lib/utils";
import { useMutation, useQuery } from "convex/react";
import { ChevronDown } from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AudioRecorderField } from "@/components/journal/library/AudioRecorderField";
import { DateField } from "@/components/journal/library/DateField";
import { EntryImageUpload } from "@/components/journal/library/EntryImageUpload";
import {
	type EntryMode,
	EntryModeTabs,
} from "@/components/journal/library/EntryModeTabs";
import {
	accentForMode,
	bubbleCreateButtonClass,
	bubbleDownloadButtonClass,
	bubbleFieldStack,
	bubbleFormShell,
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
import { ScrollArea } from "@/components/journal/ui/scroll-area";
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
	messageFromUnknownError,
	toastMutationError,
	toastMutationSuccess,
} from "@/lib/journal/toast";
import { uploadToStorage } from "@/lib/journal/uploadToStorage";

type JournalWithCover = Doc<"journals"> & { coverImageUrl?: string };

type AddJournalEntryPanelProps = {
	journalId: Id<"journals"> | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onCreated?: () => void;
};

export function AddJournalEntryPanel({
	journalId,
	open,
	onOpenChange,
	onCreated,
}: AddJournalEntryPanelProps) {
	const formId = useId();
	const createEntry = useMutation(api.journal.entries.mutations.create);
	const generateUploadUrl = useMutation(
		api.journal.mutations.generateUploadUrl,
	);
	const allJournals = useQuery(
		api.journal.queries.listByType,
		open ? {} : "skip",
	);
	const preselectedJournal = useQuery(
		api.journal.queries.getById,
		open && journalId ? { id: journalId } : "skip",
	);

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

	const [mounted, setMounted] = useState(false);
	const [visible, setVisible] = useState(false);
	const [mode, setMode] = useState<EntryMode>("writing");
	const [selectedJournalId, setSelectedJournalId] =
		useState<Id<"journals"> | null>(journalId);
	const [title, setTitle] = useState("");
	const [date, setDate] = useState<Date | undefined>(undefined);
	const [body, setBody] = useState("");
	const [imageFile, setImageFile] = useState<File | null>(null);
	const [imagePreview, setImagePreview] = useState<string | null>(null);
	const [audioFile, setAudioFile] = useState<File | null>(null);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [showErrors, setShowErrors] = useState(false);

	const accent = accentForMode(mode);

	const titleInvalid = !title.trim();
	const dateInvalid = date === undefined;
	const bodyInvalid = mode === "writing" && !body.trim();
	const audioInvalid = mode === "recording" && audioFile === null;
	const journalInvalid = selectedJournalId === null;

	const isValid =
		!titleInvalid &&
		!dateInvalid &&
		!journalInvalid &&
		(mode === "writing" ? !bodyInvalid : !audioInvalid);

	const resetForm = useCallback(() => {
		setMode("writing");
		setSelectedJournalId(journalId);
		setTitle("");
		setDate(undefined);
		setBody("");
		setAudioFile(null);
		setImageFile(null);
		setImagePreview((prev) => {
			if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
			return null;
		});
		setError(null);
		setShowErrors(false);
	}, [journalId]);

	const closeWithAnimation = useCallback(() => {
		setVisible(false);
		window.setTimeout(() => {
			onOpenChange(false);
			resetForm();
		}, 300);
	}, [onOpenChange, resetForm]);

	useEffect(() => {
		setMounted(true);
	}, []);

	useEffect(() => {
		if (open) {
			resetForm();
			if (journalId) setSelectedJournalId(journalId);
			requestAnimationFrame(() => setVisible(true));
		} else {
			setVisible(false);
		}
	}, [open, journalId, resetForm]);

	useEffect(() => {
		if (!open) return;
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") closeWithAnimation();
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [open, closeWithAnimation]);

	useEffect(() => {
		if (!open) return;
		const prev = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		return () => {
			document.body.style.overflow = prev;
		};
	}, [open]);

	const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const raw = e.target.files?.[0];
		if (!raw) return;
		const file = await compressImageFile(raw);
		if (imagePreview?.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
		setImageFile(file);
		setImagePreview(URL.createObjectURL(file));
	};

	const handleDownload = () => {
		if (mode === "writing" && body.trim()) {
			const blob = new Blob([body], { type: "text/plain" });
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `${title.trim() || "entry"}.txt`;
			a.click();
			URL.revokeObjectURL(url);
			return;
		}
		if (mode === "recording" && audioFile) {
			const url = URL.createObjectURL(audioFile);
			const a = document.createElement("a");
			a.href = url;
			a.download = audioFile.name;
			a.click();
			URL.revokeObjectURL(url);
		}
	};

	const handleCreate = async () => {
		setShowErrors(true);
		if (!isValid || !selectedJournalId || date === undefined) return;

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
			if (mode === "recording" && audioFile) {
				audioId = await uploadToStorage(
					audioFile,
					() => generateUploadUrl(),
					audioFile.type || "audio/mp4",
				);
			}

			await createEntry({
				journalId: selectedJournalId,
				title: title.trim(),
				dateMs: date.getTime(),
				mode,
				body: mode === "writing" ? body.trim() : undefined,
				imageId,
				audioId,
			});

			toastMutationSuccess("Entry added.");
			onCreated?.();
			closeWithAnimation();
		} catch (err) {
			const message = messageFromUnknownError(
				err,
				"Could not create entry. Please try again.",
			);
			setError(message);
			toastMutationError(err, message);
		} finally {
			setSubmitting(false);
		}
	};

	if (!mounted || !open || !journalId) return null;

	const downloadBtnClass =
		mode === "writing"
			? bubbleDownloadButtonClass
			: cn(bubbleDownloadButtonClass, "border-[#dca114] text-[#dca114]");

	const journalSelect = (
		<div className={bubbleFieldStack}>
			<span className={bubbleLabelClass}>Select a journal</span>
			<Select
				key={`${selectedJournalId ?? "none"}-${journalOptions.length}`}
				value={selectedJournalId ?? undefined}
				onValueChange={(value) => setSelectedJournalId(value as Id<"journals">)}
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
	);

	const imageUpload = (
		<div className={bubbleFieldStack}>
			<span className={bubbleLabelClass}>Upload image (optional)</span>
			<EntryImageUpload
				accentColor={accent}
				imagePreview={imagePreview}
				onFileChange={handleImageChange}
			/>
		</div>
	);

	return createPortal(
		<div
			role="dialog"
			aria-modal="true"
			aria-label="Create journal entry"
			className={cn(
				"fixed right-0 left-0 z-[1508] mx-auto flex w-full flex-col items-center",
				"border-t-[5px] border-t-outset border-solid transition-transform duration-300 ease-in-out",
				visible ? "translate-y-0" : "translate-y-full",
			)}
			style={{
				top: dashboardLayout.headerMinHeight,
				bottom: 0,
				backgroundColor: brand.libraryMint,
				borderTopColor: mode === "writing" ? brand.primary : brand.alert,
				rowGap: 12,
			}}
		>
			<Button
				type="button"
				variant="ghost"
				size="icon"
				onClick={closeWithAnimation}
				className="mx-auto -mt-[30px] size-[60px] shrink-0 rounded-[20px] bg-white p-2.5 shadow-none hover:bg-white hover:opacity-90"
				aria-label="Close entry form"
			>
				<ChevronDown
					className="size-8"
					style={{ color: mode === "writing" ? brand.primary : brand.alert }}
					strokeWidth={2}
				/>
			</Button>

			<ScrollArea
				className="min-h-0 w-full max-w-[1200px] flex-1"
				scrollbarClassName="w-1.5 border-0 bg-transparent p-0.5 hover:bg-transparent"
				thumbClassName="rounded-full bg-[#c7c7c7]/80 hover:bg-[#a6a6a6]"
			>
				<div className="flex flex-col gap-6 px-2 pt-2 pr-2 pb-4">
					<div className="flex justify-center">
						<EntryModeTabs value={mode} onChange={setMode} />
					</div>

					<form
						id={formId}
						className={bubbleFormShell}
						onSubmit={(e) => {
							e.preventDefault();
							void handleCreate();
						}}
					>
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
									onChange={setDate}
									invalid={showErrors && dateInvalid}
									popoverClassName="z-[1600]"
									className={cn(
										showErrors && dateInvalid && "border-[#b0200c]",
									)}
								/>
							</div>
						</div>

						{mode === "writing" ? (
							<>
								<div className={bubbleFieldStack}>
									<label
										htmlFor={`${formId}-body`}
										className={bubbleLabelClass}
									>
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
								{journalSelect}
								{imageUpload}
							</>
						) : (
							<>
								{journalSelect}
								<div className={bubbleFieldStack}>
									<AudioRecorderField
										accentColor={accent}
										value={audioFile}
										onChange={setAudioFile}
										invalid={showErrors && audioInvalid}
									/>
								</div>
								{showErrors && audioInvalid ? (
									<p className="text-[#b0200c] text-sm" role="alert">
										Record audio before creating your entry.
									</p>
								) : null}
								{imageUpload}
							</>
						)}

						{showErrors && !isValid ? (
							<p className="text-[#b0200c] text-sm" role="alert">
								Please fill in all fields before creating your entry.
							</p>
						) : null}

						{error ? (
							<p className="text-[#b0200c] text-sm" role="alert">
								{error}
							</p>
						) : null}

						<div className="flex w-full justify-center gap-6 pt-2">
							<Button
								type="button"
								onClick={handleDownload}
								className={downloadBtnClass}
							>
								Download
							</Button>
							<Button
								type="submit"
								disabled={submitting || !isValid}
								className={cn(
									bubbleCreateButtonClass,
									mode === "recording" && "bg-[#dca114]",
								)}
								style={
									mode === "writing"
										? { backgroundColor: brand.primary }
										: undefined
								}
							>
								{submitting ? "Creating…" : "Create"}
							</Button>
						</div>
					</form>
				</div>
			</ScrollArea>
		</div>,
		document.body,
	);
}
