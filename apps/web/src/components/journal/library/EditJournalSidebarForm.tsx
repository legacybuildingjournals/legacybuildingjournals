import { api } from "@legacy-building/backend/convex/_generated/api";
import type {
	Doc,
	Id,
} from "@legacy-building/backend/convex/_generated/dataModel";
import { brand } from "@legacy-building/ui/lib/brand-journal";
import { cn } from "@legacy-building/ui/lib/utils";
import { useMutation } from "convex/react";
import { Camera, ChevronLeft } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { DateField } from "@/components/journal/library/DateField";
import {
	fieldInputClass,
	fieldLabelClass,
	sidebarCoverImageClass,
} from "@/components/journal/library/libraryFormStyles";
import { SidebarEditActions } from "@/components/journal/library/SidebarEditActions";
import { Button } from "@/components/journal/ui/button";
import { Input } from "@/components/journal/ui/input";
import { compressImageFile } from "@/lib/journal/compressImageFile";
import {
	messageFromUnknownError,
	toastMutationError,
	toastMutationSuccess,
} from "@/lib/journal/toast";
import { uploadCoverImage } from "@/lib/journal/uploadCoverImage";

type JournalDoc = Doc<"journals"> & { coverImageUrl?: string };

type EditJournalSidebarFormProps = {
	journal: JournalDoc;
	onCancel: () => void;
	onSaved?: () => void;
};

export function EditJournalSidebarForm({
	journal,
	onCancel,
	onSaved,
}: EditJournalSidebarFormProps) {
	const formId = useId();
	const fileRef = useRef<HTMLInputElement>(null);
	const updateJournal = useMutation(api.journal.mutations.update);
	const generateUploadUrl = useMutation(
		api.journal.mutations.generateUploadUrl,
	);

	const [title, setTitle] = useState(journal.title);
	const [date, setDate] = useState<Date | undefined>(
		() => new Date(journal.dateMs),
	);
	const [dedication, setDedication] = useState(journal.dedication ?? "");
	const [coverFile, setCoverFile] = useState<File | null>(null);
	const [coverPreview, setCoverPreview] = useState<string | null>(
		journal.coverImageUrl ?? null,
	);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [showErrors, setShowErrors] = useState(false);

	useEffect(() => {
		setTitle(journal.title);
		setDate(new Date(journal.dateMs));
		setDedication(journal.dedication ?? "");
		setCoverFile(null);
		setCoverPreview(journal.coverImageUrl ?? null);
		setError(null);
		setShowErrors(false);
		if (fileRef.current) fileRef.current.value = "";
	}, [
		journal.title,
		journal.dateMs,
		journal.dedication,
		journal.coverImageUrl,
	]);

	const hasCover = coverFile !== null || Boolean(coverPreview);
	const titleInvalid = !title.trim();
	const dateInvalid = date === undefined;
	const dedicationInvalid = !dedication.trim();
	const imageInvalid = !hasCover;
	const isValid =
		!titleInvalid && !dateInvalid && !dedicationInvalid && !imageInvalid;

	const handleCancel = useCallback(() => {
		if (coverPreview?.startsWith("blob:")) {
			URL.revokeObjectURL(coverPreview);
		}
		onCancel();
	}, [onCancel, coverPreview]);

	useEffect(() => {
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") handleCancel();
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [handleCancel]);

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

	const handleSave = async () => {
		setShowErrors(true);
		if (!isValid) return;

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
				dedication: dedication.trim(),
				coverImageId,
			});
			toastMutationSuccess("Journal updated.");
			onSaved?.();
			onCancel();
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

	return (
		<form
			id={formId}
			className="flex min-h-0 flex-1 flex-col overflow-hidden"
			onSubmit={(e) => {
				e.preventDefault();
				void handleSave();
			}}
		>
			<div className="relative min-h-[140px] shrink-0">
				<button
					type="button"
					onClick={() => fileRef.current?.click()}
					className={cn(
						"relative flex min-h-[140px] w-full cursor-pointer overflow-hidden bg-white",
						showErrors && imageInvalid
							? "ring-2 ring-[#b0200c] ring-inset"
							: "",
					)}
				>
					{coverPreview ? (
						<img
							src={coverPreview}
							alt="Cover preview"
							className={sidebarCoverImageClass}
						/>
					) : null}
					<span
						className="pointer-events-none absolute right-2 bottom-2 flex size-8 items-center justify-center rounded-full bg-white shadow-sm"
						aria-hidden
					>
						<Camera
							className="size-4"
							style={{ color: brand.primary }}
							strokeWidth={2}
						/>
					</span>
				</button>
				<input
					ref={fileRef}
					type="file"
					accept="image/*"
					className="sr-only"
					onChange={handleCoverChange}
				/>
				<Button
					type="button"
					variant="ghost"
					size="icon"
					onClick={handleCancel}
					className="absolute top-2.5 left-2.5 size-[30px] rounded bg-white p-[5px] hover:bg-white hover:opacity-80"
					aria-label="Cancel editing"
				>
					<ChevronLeft
						className="size-5"
						style={{ color: brand.primary }}
						strokeWidth={2}
					/>
				</Button>
			</div>

			<div
				className="library-modal-scroll flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-3 py-4"
				style={{ backgroundColor: brand.librarySidebarBg }}
			>
				<h2 className="font-semibold text-[#1a1a1a] text-base leading-[1.4]">
					Edit journal
				</h2>

				<div className="flex flex-col gap-1">
					<label htmlFor={`${formId}-title`} className={fieldLabelClass}>
						Title
					</label>
					<Input
						id={`${formId}-title`}
						value={title}
						onChange={(e) => setTitle(e.target.value)}
						className={fieldInputClass(showErrors && titleInvalid)}
						aria-invalid={showErrors && titleInvalid}
					/>
				</div>

				<div className="flex flex-col gap-1">
					<span className={fieldLabelClass}>Date</span>
					<DateField
						value={date}
						onChange={setDate}
						invalid={showErrors && dateInvalid}
						popoverClassName="z-[1600]"
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
						className={fieldInputClass(showErrors && dedicationInvalid)}
						aria-invalid={showErrors && dedicationInvalid}
					/>
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
			</div>

			<SidebarEditActions onCancel={handleCancel} submitting={submitting} />
		</form>
	);
}
