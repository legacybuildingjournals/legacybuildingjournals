import { useCallback, useEffect, useState } from "react";

import { ADMIN_PAGE_SIZE } from "@/lib/pagination";

type PaginatedStatus =
	| "LoadingFirstPage"
	| "LoadingMore"
	| "CanLoadMore"
	| "Exhausted";

/**
 * Page-based window over Convex `usePaginatedQuery` results (10 items per page).
 * Waits for the next cursor page to load before advancing — avoids empty tables.
 */
export function usePaginatedPage<T>(
	items: T[],
	status: PaginatedStatus,
	loadMore: (numItems: number) => void,
	pageSize = ADMIN_PAGE_SIZE,
) {
	const [pageIndex, setPageIndex] = useState(0);
	const [pendingPageIndex, setPendingPageIndex] = useState<number | null>(null);

	const isLoadingMore = status === "LoadingMore";
	const canLoadMore = status === "CanLoadMore";
	const isExhausted = status === "Exhausted";

	const pageStart = pageIndex * pageSize;
	const pageItems = items.slice(pageStart, pageStart + pageSize);
	const hasPrevPage = pageIndex > 0;
	const hasNextPage = items.length > pageStart + pageSize || canLoadMore;

	const isPageTransitioning = pendingPageIndex !== null || isLoadingMore;

	const totalCount = isExhausted ? items.length : undefined;
	const totalPages =
		totalCount !== undefined
			? Math.max(1, Math.ceil(totalCount / pageSize))
			: undefined;

	// Preload remaining pages so total page count is available on first view.
	useEffect(() => {
		if (status === "CanLoadMore") {
			loadMore(Math.max(pageSize * 5, 50));
		}
	}, [status, loadMore, pageSize]);

	const rangeLabel =
		pageItems.length === 0
			? null
			: totalCount !== undefined
				? `Showing ${pageStart + 1}–${pageStart + pageItems.length} of ${totalCount}`
				: `Showing ${pageStart + 1}–${pageStart + pageItems.length}`;

	const resetPage = useCallback(() => {
		setPageIndex(0);
		setPendingPageIndex(null);
	}, []);

	const goToPrev = useCallback(() => {
		setPendingPageIndex(null);
		setPageIndex((p) => Math.max(0, p - 1));
	}, []);

	const goToNext = useCallback(() => {
		if (!hasNextPage || pendingPageIndex !== null) return;

		const nextIndex = pageIndex + 1;
		const minItemsToShowNextPage = nextIndex * pageSize + 1;

		if (items.length >= minItemsToShowNextPage) {
			setPageIndex(nextIndex);
			return;
		}

		if (canLoadMore) {
			setPendingPageIndex(nextIndex);
			loadMore(pageSize);
		}
	}, [
		hasNextPage,
		pendingPageIndex,
		pageIndex,
		pageSize,
		items.length,
		canLoadMore,
		loadMore,
	]);

	// Advance only after the next page's rows are loaded
	useEffect(() => {
		if (pendingPageIndex === null) return;

		const minItems = pendingPageIndex * pageSize + 1;
		if (items.length >= minItems) {
			setPageIndex(pendingPageIndex);
			setPendingPageIndex(null);
		}
	}, [pendingPageIndex, items.length, pageSize]);

	// Stop waiting if there is no more data to fetch
	useEffect(() => {
		if (pendingPageIndex === null || !isExhausted) return;

		const minItems = pendingPageIndex * pageSize + 1;
		if (items.length < minItems) {
			setPendingPageIndex(null);
		}
	}, [pendingPageIndex, isExhausted, items.length, pageSize]);

	return {
		pageIndex,
		pageItems,
		pageSize,
		hasPrevPage,
		hasNextPage,
		rangeLabel,
		totalPages,
		isPageTransitioning,
		isLoadingMore,
		resetPage,
		goToPrev,
		goToNext,
	};
}
