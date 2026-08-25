import { brand } from "@legacy-building/ui/lib/brand-journal";
import { cn } from "@legacy-building/ui/lib/utils";
import { ImagePlus } from "lucide-react";
import { useRef } from "react";
import { uploadTileLabelClass } from "@/components/journal/library/entryFormStyles";
import {
	sidebarCoverImageClass,
	uploadedImageFitClass,
} from "@/components/journal/library/libraryFormStyles";

type EntryImageUploadProps = {
	accentColor: string;
	imagePreview: string | null;
	invalid?: boolean;
	fullWidth?: boolean;
	onFileChange: (
		e: React.ChangeEvent<HTMLInputElement>,
	) => void | Promise<void>;
};

/** Bubble PictureInput: 265×200px tile, centered camera icon only. */
export function EntryImageUpload({
	accentColor,
	imagePreview,
	invalid,
	fullWidth = false,
	onFileChange,
}: EntryImageUploadProps) {
	const imageRef = useRef<HTMLInputElement>(null);
	const iconColor = accentColor || brand.primary;

	return (
		<div
			className={cn(
				"relative max-w-full",
				fullWidth ? "w-full self-stretch" : "w-[265px] self-start",
			)}
		>
			<button
				type="button"
				onClick={() => imageRef.current?.click()}
				className={cn(
					"relative flex max-w-full cursor-pointer overflow-hidden rounded-[10px] border bg-white transition-colors",
					fullWidth
						? "h-[200px] w-full"
						: "aspect-square w-full max-w-[370px] flex-col items-center justify-center gap-3",
					imagePreview && fullWidth ? "" : "p-3",
					invalid ? "border-[#b0200c]" : "border-[#e9ecef]",
				)}
				aria-label="Upload image"
				aria-invalid={invalid}
			>
				{imagePreview ? (
					<img
						src={imagePreview}
						alt="Entry preview"
						decoding="async"
						className={
							fullWidth ? sidebarCoverImageClass : uploadedImageFitClass
						}
					/>
				) : (
					<>
						<ImagePlus
							className="size-10 shrink-0"
							style={{ color: iconColor }}
							strokeWidth={1.5}
							aria-hidden
						/>
						<span className={uploadTileLabelClass} style={{ color: iconColor }}>
							Upload a file
						</span>
					</>
				)}
			</button>
			<input
				ref={imageRef}
				type="file"
				accept="image/*"
				className="sr-only"
				onChange={onFileChange}
			/>
		</div>
	);
}
