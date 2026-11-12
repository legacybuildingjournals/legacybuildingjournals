import { zodResolver } from "@hookform/resolvers/zod";
import { imageAssets } from "@legacy-building/assets";
import { api } from "@legacy-building/backend/convex/_generated/api";
import type { Id } from "@legacy-building/backend/convex/_generated/dataModel";
import { cn } from "@legacy-building/ui/lib/utils";
import { useAction, useMutation } from "convex/react";
import { ChevronLeft, ImageIcon, Loader2, SquareCheck } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { useForm } from "react-hook-form";

import { BackCoverPreview } from "@/components/journal/library/BackCoverPreview";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/journal/ui/dialog";
import { Input } from "@/components/journal/ui/input";
import { Textarea } from "@/components/journal/ui/textarea";
import {
	BACK_COVER_IMAGE_TYPES,
	BACK_COVER_MESSAGE_MAX,
	BACK_COVER_TITLE_MAX,
	type BackCoverDesign,
	type BackCoverTextValues,
	backCoverSchema,
	EMPTY_BACK_COVER,
	isBackCoverEmpty,
} from "@/lib/journal/backCover";
import { compressImageFile } from "@/lib/journal/compressImageFile";
import { downloadJournalPdf } from "@/lib/journal/exportJournalPdf";
import {
	messageFromUnknownError,
	toastMutationError,
	toastMutationSuccess,
} from "@/lib/journal/toast";
import { uploadToStorage } from "@/lib/journal/uploadToStorage";

type Step = "intro" | "design" | "edit";

const STEPS = [
	"Add back cover details",
	"Preview your book",
	"Export as pdf",
] as const;

const primaryButtonClass = cn(
	"flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-6 font-semibold text-primary-foreground text-sm shadow-sm",
	"transition-colors hover:bg-primary/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60",
	"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
);

/**
 * Figma "Journal Export Feature Flows" for the web: after picking entries the
 * user is introduced to the book, designs its back cover (photo, title,
 * message) and exports. The PDF is unchanged apart from the back cover added
 * as its last page. Same steps on phones and desktop, inside one dialog.
 */
export function ExportBookDialog({
	open,
	onOpenChange,
	journalId,
	journalTitle,
	entryIds,
	onExported,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	journalId: Id<"journals">;
	journalTitle: string;
	/** Omitted when the whole journal is exported. */
	entryIds?: Id<"journalEntries">[];
	onExported: () => void;
}) {
	const exportJournal = useAction(api.journal.actions.exportJournal);
	const generateUploadUrl = useMutation(
		api.journal.mutations.generateUploadUrl,
	);
	const [step, setStep] = useState<Step>("intro");
	const [design, setDesign] = useState<BackCoverDesign>(EMPTY_BACK_COVER);
	const [exporting, setExporting] = useState(false);

	// Each new export starts fresh.
	useEffect(() => {
		if (open) {
			setStep("intro");
			setDesign(EMPTY_BACK_COVER);
		}
	}, [open]);

	const runExport = async () => {
		if (exporting) return;
		setExporting(true);
		try {
			const imageStorageId = design.photo
				? await uploadToStorage(
						design.photo,
						() => generateUploadUrl(),
						design.photo.type,
					)
				: undefined;
			const { url } = await exportJournal({
				journalId,
				entryIds,
				backCover: {
					imageStorageId,
					title: design.title.trim() || undefined,
					message: design.message.trim() || undefined,
				},
			});
			await downloadJournalPdf({ url, journalTitle });
			toastMutationSuccess("PDF downloaded.");
			onExported();
			onOpenChange(false);
		} catch (err) {
			toastMutationError(
				err,
				messageFromUnknownError(err, "Could not export PDF. Please try again."),
			);
		} finally {
			setExporting(false);
		}
	};

	const heading =
		step === "intro"
			? "Export Book"
			: step === "design"
				? "Design Back Cover"
				: "Edit Back Cover";

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				if (exporting) return;
				onOpenChange(next);
			}}
		>
			<DialogContent className="max-h-[92svh] max-w-md overflow-y-auto rounded-2xl sm:max-w-md">
				<DialogHeader className="flex-row items-center gap-2">
					{step !== "intro" ? (
						<button
							type="button"
							onClick={() => setStep(step === "edit" ? "design" : "intro")}
							disabled={exporting}
							aria-label="Back"
							className="-ml-1 rounded-full p-1 text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95 disabled:opacity-50"
						>
							<ChevronLeft className="size-5" aria-hidden />
						</button>
					) : null}
					<DialogTitle>{heading}</DialogTitle>
					<DialogDescription className="sr-only">
						Add a back cover to your journal book, then export it as a PDF.
					</DialogDescription>
				</DialogHeader>

				{step === "intro" ? (
					<div className="flex flex-col items-center gap-5 pt-2">
						<img
							src={imageAssets.exportBookSample}
							alt="Example back cover with a family portrait"
							className="w-44 -rotate-3 rounded-md shadow-lg"
						/>
						<div className="flex flex-col gap-2 text-center">
							<h3 className="font-bold text-2xl text-foreground">
								Turn Your Journal into a Book
							</h3>
							<p className="text-muted-foreground text-sm">
								Create a beautiful journal book of your stories, memories, and
								moments.
							</p>
						</div>
						<ul className="flex w-full flex-col gap-3">
							{STEPS.map((label) => (
								<li key={label} className="flex items-center gap-3">
									<span className="flex size-7 items-center justify-center rounded-md bg-primary/15 text-primary">
										<SquareCheck className="size-4" aria-hidden />
									</span>
									<span className="font-semibold text-foreground text-sm">
										{label}
									</span>
								</li>
							))}
						</ul>
						<button
							type="button"
							className={primaryButtonClass}
							onClick={() => setStep("design")}
						>
							Get Started
						</button>
					</div>
				) : null}

				{step === "design" ? (
					<div className="flex flex-col gap-5">
						<div className="flex flex-col gap-1">
							<h3 className="font-bold text-foreground text-xl">
								Design Your Back Cover
							</h3>
							<p className="text-muted-foreground text-sm">
								Add a photo, title, and a short message for the back of your
								book.
							</p>
						</div>
						<BackCoverPreview design={design} onEdit={() => setStep("edit")} />
						{isBackCoverEmpty(design) ? (
							<div className="flex flex-col gap-2">
								<button
									type="button"
									className={primaryButtonClass}
									onClick={() => setStep("edit")}
								>
									Design Back Cover
								</button>
								<button
									type="button"
									onClick={() => void runExport()}
									disabled={exporting}
									className="rounded-md py-1 text-muted-foreground text-sm underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
								>
									{exporting
										? "Exporting…"
										: "Skip and export without a back cover design"}
								</button>
							</div>
						) : (
							<button
								type="button"
								className={primaryButtonClass}
								onClick={() => void runExport()}
								disabled={exporting}
							>
								{exporting ? (
									<>
										<Loader2 className="size-4 animate-spin" aria-hidden />
										Exporting…
									</>
								) : (
									"Export Book"
								)}
							</button>
						)}
					</div>
				) : null}

				{step === "edit" ? (
					<BackCoverEditForm
						design={design}
						onDone={(next) => {
							setDesign(next);
							setStep("design");
						}}
					/>
				) : null}
			</DialogContent>
		</Dialog>
	);
}

/** Figma "Edit Back Cover": photo, title and message. Nothing uploads yet. */
function BackCoverEditForm({
	design,
	onDone,
}: {
	design: BackCoverDesign;
	onDone: (design: BackCoverDesign) => void;
}) {
	const idPrefix = useId();
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [photo, setPhoto] = useState<File | null>(design.photo);
	const [photoUrl, setPhotoUrl] = useState<string | null>(null);
	const [photoError, setPhotoError] = useState<string | null>(null);
	const [preparing, setPreparing] = useState(false);

	const form = useForm<BackCoverTextValues>({
		resolver: zodResolver(backCoverSchema),
		defaultValues: { title: design.title, message: design.message },
	});
	const { errors } = form.formState;
	const messageLength = form.watch("message")?.length ?? 0;

	useEffect(() => {
		if (!photo) {
			setPhotoUrl(null);
			return;
		}
		const url = URL.createObjectURL(photo);
		setPhotoUrl(url);
		return () => URL.revokeObjectURL(url);
	}, [photo]);

	const onPickFile = async (file: File | undefined) => {
		if (!file) return;
		setPhotoError(null);
		setPreparing(true);
		try {
			// Normalises orientation and size, and turns most formats into JPEG.
			const prepared = await compressImageFile(file);
			if (!BACK_COVER_IMAGE_TYPES.includes(prepared.type)) {
				setPhotoError("Choose a JPG or PNG photo.");
				return;
			}
			setPhoto(prepared);
		} finally {
			setPreparing(false);
		}
	};

	const onSubmit = form.handleSubmit((values) => onDone({ ...values, photo }));

	return (
		<form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
			<div className="flex flex-col gap-2">
				<span className="font-semibold text-foreground text-sm">
					Back Cover Photo
				</span>
				<div className="rounded-2xl border border-border p-3">
					<input
						ref={fileInputRef}
						type="file"
						accept="image/*"
						className="hidden"
						onChange={(event) => {
							void onPickFile(event.target.files?.[0]);
							event.target.value = "";
						}}
					/>
					<button
						type="button"
						onClick={() => fileInputRef.current?.click()}
						disabled={preparing}
						className="relative flex h-32 w-full items-center justify-center overflow-hidden rounded-xl bg-muted transition-colors hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.99] disabled:opacity-60"
					>
						{photoUrl ? (
							<>
								<img
									src={photoUrl}
									alt="Selected back cover"
									className="size-full object-cover"
								/>
								<span className="absolute right-2 bottom-2 rounded-full bg-background px-3 py-1 font-semibold text-foreground text-xs">
									Change
								</span>
							</>
						) : (
							<span className="flex flex-col items-center gap-1 font-semibold text-foreground text-sm">
								{preparing ? (
									<Loader2 className="size-4 animate-spin" aria-hidden />
								) : (
									<ImageIcon className="size-4" aria-hidden />
								)}
								{preparing ? "Preparing…" : "Choose an Image"}
							</span>
						)}
					</button>
					{photo ? (
						<button
							type="button"
							onClick={() => setPhoto(null)}
							className="mx-auto mt-2 block rounded-md px-2 py-1 text-muted-foreground text-xs transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
						>
							Remove photo
						</button>
					) : null}
					{photoError ? (
						<p
							className="mt-2 text-center text-destructive text-xs"
							role="alert"
						>
							{photoError}
						</p>
					) : null}
				</div>
			</div>

			<div className="flex flex-col gap-1.5">
				<label
					htmlFor={`${idPrefix}-title`}
					className="font-semibold text-foreground text-sm"
				>
					Back Cover Title
				</label>
				<Input
					{...form.register("title")}
					id={`${idPrefix}-title`}
					placeholder="e.g. A story worth keeping"
					maxLength={BACK_COVER_TITLE_MAX}
					className="h-11 rounded-xl"
					aria-invalid={Boolean(errors.title)}
					aria-describedby={`${idPrefix}-title-error`}
				/>
				{errors.title?.message ? (
					<p
						id={`${idPrefix}-title-error`}
						className="text-destructive text-xs"
					>
						{errors.title.message}
					</p>
				) : null}
			</div>

			<div className="flex flex-col gap-1.5">
				<label
					htmlFor={`${idPrefix}-message`}
					className="font-semibold text-foreground text-sm"
				>
					Back Cover Message
				</label>
				<Textarea
					{...form.register("message")}
					id={`${idPrefix}-message`}
					placeholder="Write a short message..."
					rows={4}
					maxLength={BACK_COVER_MESSAGE_MAX}
					className="min-h-28 rounded-xl"
					aria-invalid={Boolean(errors.message)}
					aria-describedby={`${idPrefix}-message-error`}
				/>
				<span className="self-end text-muted-foreground text-xs">
					{messageLength}/{BACK_COVER_MESSAGE_MAX}
				</span>
				{errors.message?.message ? (
					<p
						id={`${idPrefix}-message-error`}
						className="text-destructive text-xs"
					>
						{errors.message.message}
					</p>
				) : null}
			</div>

			<button type="submit" className={primaryButtonClass} disabled={preparing}>
				Done
			</button>
		</form>
	);
}
