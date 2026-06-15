import { type RefObject, useCallback, useEffect, useState } from "react";

export const SIDEBAR_COVER_EXPANDED_PX = 200;
export const SIDEBAR_COVER_COLLAPSED_PX = 72;

export function collapsingCoverHeight(scrollTop: number): number {
	return Math.max(
		SIDEBAR_COVER_COLLAPSED_PX,
		SIDEBAR_COVER_EXPANDED_PX - scrollTop,
	);
}

/** Shrinks a sticky sidebar cover between expanded and collapsed height as the user scrolls. */
export function useCollapsingSidebarCover(
	scrollRef: RefObject<HTMLElement | null>,
	resetKey: string | null | undefined,
) {
	const [coverHeight, setCoverHeight] = useState(SIDEBAR_COVER_EXPANDED_PX);

	const onScroll = useCallback(() => {
		const el = scrollRef.current;
		if (!el) return;
		setCoverHeight(collapsingCoverHeight(el.scrollTop));
	}, [scrollRef]);

	useEffect(() => {
		setCoverHeight(SIDEBAR_COVER_EXPANDED_PX);
		scrollRef.current?.scrollTo({ top: 0 });
	}, [resetKey, scrollRef]);

	useEffect(() => {
		const el = scrollRef.current;
		if (!el) return;
		el.addEventListener("scroll", onScroll, { passive: true });
		return () => el.removeEventListener("scroll", onScroll);
	}, [onScroll, scrollRef, resetKey]);

	return coverHeight;
}
