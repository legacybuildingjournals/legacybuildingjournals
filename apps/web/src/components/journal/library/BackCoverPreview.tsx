import { imageAssets } from "@legacy-building/assets";
import { cn } from "@legacy-building/ui/lib/utils";
import { Heart, Pencil } from "lucide-react";
import { useEffect, useState } from "react";

import {
	type BackCoverDesign,
	isBackCoverEmpty,
} from "@/lib/journal/backCover";

/**
 * On-screen version of the PDF's back cover page: the empty template until
 * something is filled in, then the blank leather with the photo, title and
 * message laid over it in the same arrangement as the exported page.
 */
export function BackCoverPreview({
	design,
	onEdit,
}: {
	design: BackCoverDesign;
	onEdit: () => void;
}) {
	const empty = isBackCoverEmpty(design);
	const title = design.title.trim();
	const message = design.message.trim();
	const [photoUrl, setPhotoUrl] = useState<string | null>(null);

	useEffect(() => {
		if (!design.photo) {
			setPhotoUrl(null);
			return;
		}
		const url = URL.createObjectURL(design.photo);
		setPhotoUrl(url);
		return () => URL.revokeObjectURL(url);
	}, [design.photo]);

	return (
		<div className="relative mx-auto aspect-[4/5] w-full max-w-[300px] overflow-hidden rounded-lg shadow-md">
			<img
				src={empty ? imageAssets.backCoverTemplate : imageAssets.backCoverBlank}
				alt="Back cover preview"
				className="absolute inset-0 size-full object-cover"
			/>
			{empty ? null : (
				<div
					className={cn(
						"absolute inset-x-0 flex flex-col items-center px-8",
						photoUrl ? "top-[16%]" : "top-[34%]",
					)}
				>
					{photoUrl ? (
						<div className="aspect-[3/2] w-[60%] -rotate-[1.2deg] bg-cover-cream p-1 shadow-md">
							<img
								src={photoUrl}
								alt="Back cover"
								className="size-full object-cover"
							/>
						</div>
					) : null}
					{title ? (
						<p className="mt-4 line-clamp-2 text-center text-cover-gold text-sm uppercase tracking-[0.18em]">
							{title}
						</p>
					) : null}
					<div className="mt-2 flex w-[70%] items-center gap-1.5 text-cover-gold">
						<span className="h-px flex-1 bg-cover-gold" />
						<Heart className="size-2.5" aria-hidden />
						<span className="h-px flex-1 bg-cover-gold" />
					</div>
					{message ? (
						<p className="mt-2 line-clamp-6 text-center text-[9px] text-cover-cream leading-[13px]">
							{message}
						</p>
					) : null}
				</div>
			)}
			<button
				type="button"
				onClick={onEdit}
				className="absolute right-3 bottom-4 inline-flex items-center gap-1.5 rounded-full bg-background px-3 py-1.5 font-semibold text-foreground text-xs shadow-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97]"
			>
				<Pencil className="size-3.5" aria-hidden />
				Edit Design
			</button>
		</div>
	);
}
