import { api } from "@legacy-building/backend/convex/_generated/api";
import type { Id } from "@legacy-building/backend/convex/_generated/dataModel";
import { cn } from "@legacy-building/ui/lib/utils";
import { useQuery } from "convex/react";
import { useState } from "react";

type EntryCoverImageProps = {
	imageId?: Id<"_storage">;
	imageUrl?: string;
	className?: string;
};

function isHttpUrl(url: string | undefined): url is string {
	return url?.startsWith("http") ?? false;
}

export function EntryCoverImage({
	imageId,
	imageUrl,
	className,
}: EntryCoverImageProps) {
	const [failedSrc, setFailedSrc] = useState<string | null>(null);
	const [refreshFromStorage, setRefreshFromStorage] = useState(false);

	const hasCachedUrl = isHttpUrl(imageUrl);
	const shouldFetchStorage =
		Boolean(imageId) && (!hasCachedUrl || refreshFromStorage);

	const storageUrl = useQuery(
		api.journal.entries.queries.getEntryImageUrl,
		shouldFetchStorage && imageId ? { storageId: imageId } : "skip",
	);

	const src = refreshFromStorage
		? (storageUrl ?? undefined)
		: hasCachedUrl
			? imageUrl
			: (storageUrl ?? undefined);

	const loadError = failedSrc === src;

	if (!src || loadError) {
		return (
			<div
				className={cn(
					"min-h-[120px] w-full max-w-[280px] bg-[#f2f2f2]",
					className,
				)}
				aria-hidden
			/>
		);
	}

	return (
		<img
			src={src}
			alt=""
			loading="lazy"
			decoding="async"
			className={className}
			onError={() => {
				if (!refreshFromStorage && imageId && hasCachedUrl) {
					setRefreshFromStorage(true);
					return;
				}
				setFailedSrc(src);
			}}
		/>
	);
}
