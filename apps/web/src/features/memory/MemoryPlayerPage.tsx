import { api } from "@legacy-building/backend/convex/_generated/api";
import { Skeleton } from "@legacy-building/ui/components/skeleton";
import { useQuery } from "convex/react";
import { VolumeX } from "lucide-react";

export type MemoryKind = "voice" | "video";

function formatDate(ms: number): string {
	return new Date(ms).toLocaleDateString("en-US", {
		month: "long",
		day: "numeric",
		year: "numeric",
	});
}

/**
 * Public player behind the QR codes printed in journal books. Needs no account:
 * the printed link is the whole credential.
 */
export function MemoryPlayerPage({
	entryId,
	kind,
}: {
	entryId: string;
	kind: MemoryKind;
}) {
	const memory = useQuery(api.journal.entries.queries.getPublicMemory, {
		id: entryId,
		kind,
	});

	return (
		<main className="flex min-h-svh w-full flex-col items-center justify-center gap-6 bg-background px-5 py-10 text-center text-foreground">
			{memory === undefined ? (
				<div className="flex w-full max-w-md flex-col items-center gap-4">
					<Skeleton className="h-7 w-2/3" />
					<Skeleton className="h-4 w-1/3" />
					<Skeleton
						className={kind === "video" ? "aspect-video w-full" : "h-14 w-full"}
					/>
				</div>
			) : memory === null ? (
				<div className="flex max-w-sm flex-col items-center gap-3">
					<VolumeX className="size-10 text-muted-foreground" aria-hidden />
					<h1 className="font-semibold text-xl">This memory isn't available</h1>
					<p className="text-muted-foreground text-sm">
						The recording may have been removed, or the link was copied
						incorrectly.
					</p>
				</div>
			) : (
				<div className="flex w-full max-w-md flex-col items-center gap-4">
					<h1 className="font-semibold text-2xl">
						{memory.title?.trim() || "A memory"}
					</h1>
					<p className="text-muted-foreground text-sm">
						{formatDate(memory.dateMs)}
					</p>
					{kind === "video" ? (
						// biome-ignore lint/a11y/useMediaCaption: user-recorded memories have no caption track
						<video
							src={memory.url}
							controls
							playsInline
							preload="metadata"
							className="aspect-video w-full rounded-xl bg-black"
						/>
					) : (
						// biome-ignore lint/a11y/useMediaCaption: user-recorded memories have no caption track
						<audio
							src={memory.url}
							controls
							preload="metadata"
							className="w-full"
						/>
					)}
				</div>
			)}
		</main>
	);
}
