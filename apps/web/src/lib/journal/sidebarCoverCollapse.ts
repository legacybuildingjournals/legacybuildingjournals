export const SIDEBAR_COVER_MAX_HEIGHT = 200;
export const SIDEBAR_COVER_MIN_HEIGHT = 64;
export const SIDEBAR_COVER_COLLAPSE_RANGE =
	SIDEBAR_COVER_MAX_HEIGHT - SIDEBAR_COVER_MIN_HEIGHT;

export function sidebarCoverHeight(scrollTop: number): number {
	return Math.max(
		SIDEBAR_COVER_MIN_HEIGHT,
		SIDEBAR_COVER_MAX_HEIGHT -
			Math.min(scrollTop, SIDEBAR_COVER_COLLAPSE_RANGE),
	);
}

/** Vertical padding shrinks slightly as the cover collapses (12px → 6px). */
export function sidebarCoverPaddingY(coverHeight: number): number {
	const t =
		(coverHeight - SIDEBAR_COVER_MIN_HEIGHT) / SIDEBAR_COVER_COLLAPSE_RANGE;
	return 6 + t * 6;
}
