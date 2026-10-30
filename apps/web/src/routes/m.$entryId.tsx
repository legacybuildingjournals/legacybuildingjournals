import { createFileRoute } from "@tanstack/react-router";

import { MemoryPlayerPage } from "@/features/memory/MemoryPlayerPage";

export const Route = createFileRoute("/m/$entryId")({
	component: MemoryRoute,
	validateSearch: (search: Record<string, unknown>) => ({
		k: search.k === "video" ? ("video" as const) : ("voice" as const),
	}),
	head: () => ({
		meta: [{ title: "A memory · Legacy Building" }],
	}),
});

function MemoryRoute() {
	const { entryId } = Route.useParams();
	const { k } = Route.useSearch();
	return <MemoryPlayerPage entryId={entryId} kind={k} />;
}
