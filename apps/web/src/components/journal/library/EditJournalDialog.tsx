import { api } from "@legacy-building/backend/convex/_generated/api";
import type {
	Doc,
	Id,
} from "@legacy-building/backend/convex/_generated/dataModel";
import { brand } from "@legacy-building/ui/lib/brand-journal";
import { cn } from "@legacy-building/ui/lib/utils";
import { useMutation } from "convex/react";
import { Camera, X } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { DateField } from "@/components/journal/library/DateField";
import { JournalTypePicker } from "@/components/journal/library/JournalTypePicker";
import { uploadedImageFitClass } from "@/components/journal/library/libraryFormStyles";
import { Button } from "@/components/journal/ui/button";
import { Dialog, DialogTitle } from "@/components/journal/ui/dialog";
import { DialogContentWithOverlay } from "@/components/journal/ui/dialog-content-with-overlay";
import { Input } from "@/components/journal/ui/input";
import { compressImageFile } from "@/lib/journal/compressImageFile";
import type { StoryTab } from "@/lib/journal/journalTypes";
import {
	messageFromUnknownError,
	toastMutationError,
	toastMutationSuccess,
} from "@/lib/journal/toast";
import { uploadCoverImage } from "@/lib/journal/uploadCoverImage";

const fieldLabelClass = "text-sm font-normal leading-[1.4] text-[#1a1a1a]";

function fieldInputClass(invalid: boolean) {
	return cn(
		"h-11 w-full min-w-0 rounded-xl border bg-white px-3 font-normal text-[#1a1a1a] text-sm shadow-none focus-visible:ring-0",
		invalid
			? "border-[#b0200c] focus-visible:border-[#b0200c]"
			: "border-[#c7c7c7] focus-visible:border-[#c7c7c7]",
	);
}

type JournalDoc = Doc<"journals"> & { coverImageUrl?: string };

type EditJournalDialogProps = {
	journal: JournalDoc | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSaved?: () => void;
};

export function EditJournalDialog({
	journal,
	open,
	onOpenChange,
	onSaved,
}: EditJournalDialogProps) {
	const formId = useId();
	const fileRef = useRef<HTMLInputElement>(null);
	const updateJournal = useMutation(api.journal.mutations.update);
	const generateUploadUrl = useMutation(
		api.journal.mutations.generateUploadUrl,
	);

	const [title, setTitle] = useState("");
	const [date, setDate] = useState<Date | undefined>(undefined);
	const [storyType, setStoryType] = useState<StoryTab>("my_story");
	const [dedication, setDedication] = useState("");
	const [coverFile, setCoverFile] = useState<File | null>(null);
	const [coverPreview, setCoverPreview] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [showErrors, setShowErrors] = useState(false);

	const hasCover = coverFile !== null || Boolean(coverPreview);
	const titleInvalid = !title.trim();
	const dateInvalid = date === undefined;
	const dedicationInvalid = !dedication.trim();
	const imageInvalid = !hasCover;
	const isValid =
		!titleInvalid && !dateInvalid && !dedicationInvalid && !imageInvalid;

	const titleShowError = showErrors && titleInvalid;
	const dateShowError = showErrors && dateInvalid;
	const dedicationShowError = showErrors && dedicationInvalid;
	const imageShowError = showErrors && imageInvalid;

	const resetFromJournal = useCallback((j: JournalDoc) => {
		setTitle(j.title);
		setDate(new Date(j.dateMs));
		setStoryType(j.type);
		setDedication(j.dedication ?? "");
		setCoverFile(null);
		setCoverPreview(j.coverImageUrl ?? null);
		setError(null);
		setShowErrors(false);
		if (fileRef.current) fileRef.current.value = "";
	}, []);

	useEffect(() => {
		if (open && journal) {
			resetFromJournal(journal);
		}
	}, [open, journal, resetFromJournal]);

	const handleClose = useCallback(
		(next: boolean) => {
			if (!next && coverPreview?.startsWith("blob:")) {
				URL.revokeObjectURL(coverPreview);
			}
			if (!next) {
				setError(null);
				setShowErrors(false);
			}
			onOpenChange(next);
		},
		[onOpenChange, coverPreview],
	);

	const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const raw = e.target.files?.[0];
		if (!raw) return;
		const file = await compressImageFile(raw);
		if (coverPreview?.startsWith("blob:")) {
			URL.revokeObjectURL(coverPreview);
		}
		setCoverFile(file);
		setCoverPreview(URL.createObjectURL(file));
	};

	const handleUpdate = async () => {
		if (!journal) return;
		setShowErrors(true);
		if (!isValid || date === undefined) return;

		setSubmitting(true);
		setError(null);
		try {
			let coverImageId: Id<"_storage"> | undefined;
			if (coverFile) {
				coverImageId = await uploadCoverImage(coverFile, () =>
					generateUploadUrl(),
				);
			}

			await updateJournal({
				id: journal._id,
				title: title.trim(),
				dateMs: date.getTime(),
				type: storyType,
				dedication: dedication.trim(),
				coverImageId,
			});
			toastMutationSuccess("Journal updated.");
			onSaved?.();
			handleClose(false);
		} catch (err) {
			const message = messageFromUnknownError(
				err,
				"Could not update journal. Please try again.",
			);
			setError(message);
			toastMutationError(err, message);
		} finally {
			setSubmitting(false);
		}
	};

	if (!journal) return null;

	return (
		<Dialog open={open} onOpenChange={handleClose}>
			<DialogContentWithOverlay
				showCloseButton={false}
				overlayClassName="z-[2001] bg-foreground/60 duration-300 ease-out"
				className={cn(
					"fixed top-1/2 left-1/2 z-[2002] flex w-[calc(100%-20px)] -translate-x-1/2 -translate-y-1/2 flex-col",
					"min-h-[296px] min-w-0 max-w-[600px]",
					"max-h-[min(calc(100dvh-40px),920px)]",
					"overflow-hidden rounded-[20px] border-0 bg-white p-0",
					"shadow-[0_4px_24px_rgba(0,0,0,0.12)] ring-0",
					"sm:max-w-[600px]",
					"duration-300 ease-out",
				)}
				onOpenAutoFocus={(e) => e.preventDefault()}
			>
				<form
					id={formId}
					className={cn(
						"library-modal-scroll flex w-full flex-col overflow-y-auto overscroll-contain bg-white",
						"gap-6 rounded-xl p-5",
						"max-h-[min(calc(100dvh-40px),920px)]",
					)}
					onSubmit={(e) => {
						e.preventDefault();
						void handleUpdate();
					}}
				>
					<div className="flex shrink-0 items-start justify-between gap-3">
						<DialogTitle className="pr-2 font-semibold text-2xl text-[#1a1a1a] leading-[1.4]">
							Edit this journal
						</DialogTitle>
						<Button
							type="button"
							variant="ghost"
							size="icon"
							onClick={() => handleClose(false)}
							className="size-[30px] shrink-0 rounded p-1 hover:bg-transparent hover:opacity-80"
							style={{ color: brand.textMuted }}
							aria-label="Close"
						>
							<X className="size-5" strokeWidth={2} />
						</Button>
					</div>

					<div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
						<div className="flex min-w-0 flex-col gap-1">
							<label htmlFor={`${formId}-title`} className={fieldLabelClass}>
								Title
							</label>
							<Input
								id={`${formId}-title`}
								value={title}
								onChange={(e) => setTitle(e.target.value)}
								className={fieldInputClass(titleShowError)}
								aria-invalid={titleShowError}
							/>
						</div>
						<div className="flex min-w-0 flex-col gap-1">
							<span className={fieldLabelClass}>Date</span>
							<DateField
								value={date}
								onChange={setDate}
								invalid={dateShowError}
								popoverClassName="z-[2100]"
							/>
						</div>
					</div>

					<div className="flex flex-col gap-1">
						<span className={fieldLabelClass}>Journal type</span>
						<JournalTypePicker
							formId={formId}
							value={storyType}
							onChange={setStoryType}
							resetKey={open}
						/>
					</div>

					<div className="flex flex-col gap-1">
						<label htmlFor={`${formId}-dedication`} className={fieldLabelClass}>
							Dedication Line
						</label>
						<Input
							id={`${formId}-dedication`}
							value={dedication}
							onChange={(e) => setDedication(e.target.value)}
							className={fieldInputClass(dedicationShowError)}
							aria-invalid={dedicationShowError}
						/>
					</div>

					<div className="flex w-full flex-col gap-1">
						<span className={fieldLabelClass}>Upload image</span>
						<div className="relative w-full">
							<button
								type="button"
								onClick={() => fileRef.current?.click()}
								className={cn(
									"relative flex w-full cursor-pointer items-center justify-center",
									"overflow-hidden rounded-xl border bg-white",
									"h-[150px]",
									imageShowError ? "border-[#b0200c]" : "border-[#c7c7c7]",
								)}
								aria-invalid={imageShowError}
							>
								{coverPreview ? (
									<img
										src={coverPreview}
										alt="Cover preview"
										className={cn(uploadedImageFitClass, "max-h-[150px]")}
									/>
								) : null}
							</button>
							<button
								type="button"
								onClick={() => fileRef.current?.click()}
								className="pointer-events-none absolute top-1/2 left-1/2 flex size-[30px] -translate-x-1/2 -translate-y-1/2 items-center justify-center"
								style={{ color: brand.primary }}
								tabIndex={-1}
								aria-hidden
							>
								<Camera className="size-5" strokeWidth={2} />
							</button>
							<input
								ref={fileRef}
								type="file"
								accept="image/*"
								className="sr-only"
								onChange={handleCoverChange}
								aria-label="Upload cover image"
							/>
						</div>
					</div>

					{showErrors && !isValid ? (
						<p className="text-[#b0200c] text-sm" role="alert">
							Please fill in all fields before saving.
						</p>
					) : null}

					{error ? (
						<p className="text-[#b0200c] text-sm" role="alert">
							{error}
						</p>
					) : null}

					<div className="flex shrink-0 gap-6 pb-[max(0px,env(safe-area-inset-bottom))]">
						<Button
							type="button"
							onClick={() => handleClose(false)}
							className="min-h-11 min-w-[60px] flex-1 rounded-xl bg-[var(--lb-cancel-bg)] px-4 font-medium text-[var(--lb-cancel-text)] text-sm leading-[1.4] hover:opacity-90"
						>
							Cancel
						</Button>
						<Button
							type="submit"
							disabled={submitting}
							className="min-h-11 min-w-[60px] flex-1 rounded-xl px-5 font-medium text-sm leading-[1.4] hover:opacity-95"
						>
							{submitting ? "Updating…" : "Update"}
						</Button>
					</div>
				</form>
			</DialogContentWithOverlay>
		</Dialog>
	);
}
