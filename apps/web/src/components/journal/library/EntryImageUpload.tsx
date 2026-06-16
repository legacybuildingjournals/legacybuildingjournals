import { brand } from "@legacy-building/ui/lib/brand-journal";
import { cn } from "@legacy-building/ui/lib/utils";
import { Camera } from "lucide-react";
import { useRef } from "react";
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
					"relative flex h-[200px] max-w-full cursor-pointer overflow-hidden rounded-[12px] border bg-white",
					fullWidth ? "w-full" : "w-[265px]",
					imagePreview && fullWidth ? "" : "items-center justify-center p-3",
					invalid ? "border-[#b0200c]" : "border-[#c7c7c7]",
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
					<Camera
						className="size-[30px] shrink-0"
						style={{ color: iconColor }}
						strokeWidth={1.75}
						aria-hidden
					/>
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
