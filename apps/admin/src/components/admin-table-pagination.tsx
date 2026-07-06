import { Button } from "@legacy-building/ui/components/button";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

type AdminTablePaginationProps = {
	pageIndex: number;
	hasPrevPage: boolean;
	hasNextPage: boolean;
	rangeLabel: string | null;
	totalPages?: number;
	isPageTransitioning?: boolean;
	onPrev: () => void;
	onNext: () => void;
};

function formatPageLabel(
	displayPage: number,
	totalPages: number | undefined,
	isPageTransitioning: boolean,
) {
	if (isPageTransitioning) {
		const nextPage = displayPage + 1;
		return totalPages !== undefined
			? `Page ${nextPage} of ${totalPages}…`
			: `Page ${nextPage}…`;
	}

	return totalPages !== undefined
		? `Page ${displayPage} of ${totalPages}`
		: `Page ${displayPage}`;
}

export function AdminTablePagination({
	pageIndex,
	hasPrevPage,
	hasNextPage,
	rangeLabel,
	totalPages,
	isPageTransitioning = false,
	onPrev,
	onNext,
}: AdminTablePaginationProps) {
	const displayPage = pageIndex + 1;

	return (
		<div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
			<p className="text-muted-foreground text-sm">
				{isPageTransitioning ? (
					<span className="inline-flex items-center gap-2">
						<Loader2 className="size-4 animate-spin" aria-hidden />
						Loading page…
					</span>
				) : (
					(rangeLabel ?? "\u00a0")
				)}
			</p>
			<div className="flex items-center justify-center gap-2 sm:justify-end">
				<Button
					type="button"
					variant="outline"
					size="sm"
					className="h-9 rounded-xl px-3 transition-opacity"
					disabled={!hasPrevPage || isPageTransitioning}
					onClick={onPrev}
					aria-label="Previous page"
				>
					<ChevronLeft className="size-4" aria-hidden />
					Previous
				</Button>
				<span className="min-w-28 text-center text-muted-foreground text-sm tabular-nums">
					{isPageTransitioning ? (
						<span className="text-foreground/80">
							{formatPageLabel(displayPage, totalPages, true)}
						</span>
					) : (
						formatPageLabel(displayPage, totalPages, false)
					)}
				</span>
				<Button
					type="button"
					variant="outline"
					size="sm"
					className="h-9 rounded-xl px-3 transition-opacity"
					disabled={!hasNextPage || isPageTransitioning}
					onClick={onNext}
					aria-label="Next page"
				>
					Next
					<ChevronRight className="size-4" aria-hidden />
				</Button>
			</div>
		</div>
	);
}
