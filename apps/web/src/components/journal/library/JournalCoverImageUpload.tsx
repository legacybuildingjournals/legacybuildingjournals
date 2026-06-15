import { brand } from "@legacy-building/ui/lib/brand-journal";
import { cn } from "@legacy-building/ui/lib/utils";
import { Camera } from "lucide-react";
import { useRef } from "react";
import {
	bubbleFileInputOverlayClass,
	journalCoverPictureInputClass,
	uploadedImageFitClass,
} from "@/components/journal/library/libraryFormStyles";

type JournalCoverImageUploadProps = {
	imagePreview: string | null;
	invalid?: boolean;
	onFileChange: (
		e: React.ChangeEvent<HTMLInputElement>,
	) => void | Promise<void>;
	inputRef?: React.RefObject<HTMLInputElement | null>;
};

/** Bubble PictureInput cover tile — 150×150px square, invisible file input overlay. */
export function JournalCoverImageUpload({
	imagePreview,
	invalid,
	onFileChange,
	inputRef,
}: JournalCoverImageUploadProps) {
	const internalRef = useRef<HTMLInputElement>(null);
	const fileRef = inputRef ?? internalRef;

	return (
		<div
			className={cn(
				journalCoverPictureInputClass,
				invalid ? "border-[#b0200c]" : "border-[#c7c7c7]",
			)}
		>
			<div className="pointer-events-none flex size-full items-center justify-center p-3">
				{imagePreview ? (
					<img
						src={imagePreview}
						alt="Cover preview"
						decoding="async"
						className={uploadedImageFitClass}
					/>
				) : (
					<Camera
						className="size-[30px] shrink-0"
						style={{ color: brand.primary }}
						strokeWidth={1.75}
						aria-hidden
					/>
				)}
			</div>
			<input
				ref={fileRef}
				type="file"
				accept="image/*"
				className={bubbleFileInputOverlayClass}
				onChange={onFileChange}
				aria-label="Upload cover image"
			/>
		</div>
	);
}
