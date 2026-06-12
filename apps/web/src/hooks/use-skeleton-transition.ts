import { type RouterState, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { SKELETON_TRANSITION_MS } from "@/lib/journal/constants";

type SkeletonLocationState = {
	skeleton?: boolean;
};

/**
 * Shows a skeleton while entering a route (e.g. after navigation with skeleton state).
 */
export function useSkeletonTransition(
	durationMs = SKELETON_TRANSITION_MS,
): boolean {
	const locationState = useRouterState({
		select: (s: RouterState) =>
			s.location.state as SkeletonLocationState | undefined,
	});
	const [showSkeleton, setShowSkeleton] = useState(
		() => locationState?.skeleton === true,
	);

	useEffect(() => {
		if (!showSkeleton) return;

		const timer = window.setTimeout(() => {
			setShowSkeleton(false);
		}, durationMs);

		return () => window.clearTimeout(timer);
	}, [showSkeleton, durationMs]);

	return showSkeleton;
}
