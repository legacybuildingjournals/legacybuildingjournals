import {
	closestCenter,
	DndContext,
	type DragEndEvent,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import {
	arrayMove,
	rectSortingStrategy,
	SortableContext,
	sortableKeyboardCoordinates,
	useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { api } from "@legacy-building/backend/convex/_generated/api";
import type {
	Doc,
	Id,
} from "@legacy-building/backend/convex/_generated/dataModel";
import { cn } from "@legacy-building/ui/lib/utils";
import { useMutation } from "convex/react";
import { GripVertical } from "lucide-react";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { JournalCard } from "@/components/journal/library/JournalCard";
import type { LibraryTab } from "@/lib/journal/journalTypes";
import { toastMutationError } from "@/lib/journal/toast";

type EnrichedJournal = Doc<"journals"> & {
	coverImageUrl?: string;
	isShared?: boolean;
};

/**
 * Bookshelf rhythm. Every card is locked to CARD_HEIGHT and every grid row to
 * CARD_HEIGHT + ROW_GAP, so the shelf (cut from the library photo, with its
 * shadow) repeats exactly under each row of cards at any width, number of
 * journals or scroll position. The shelf image is one pitch tall: the shelf
 * is at its top and the rest is transparent.
 */
const CARD_HEIGHT = 224;
const ROW_GAP = 92;
const SHELF_PITCH = CARD_HEIGHT + ROW_GAP;
/** Cards stand on the shelf's top surface, a few px below its back edge. */
const SHELF_TOP = CARD_HEIGHT - 5;
const SHELF_IMAGE = "/static/icon_libraries/library-shelf.webp";

const shelfStyle = {
	backgroundImage: `url("${SHELF_IMAGE}")`,
	backgroundSize: `100% ${SHELF_PITCH}px`,
	backgroundPosition: `0 ${SHELF_TOP}px`,
	backgroundRepeat: "repeat-y",
} as const;

/**
 * Cards in a grid with a shelf under every row. The shelves run the full
 * width of the window, like the wall they hang on; the page clips the
 * overflow so it never scrolls sideways.
 */
function ShelfGrid({ children }: { children: ReactNode }) {
	return (
		<div className="relative w-full">
			<div
				aria-hidden
				className="pointer-events-none absolute inset-y-0 left-1/2 w-screen -translate-x-1/2"
				style={shelfStyle}
			/>
			<div
				className="relative grid w-full grid-cols-1 gap-x-5 pb-16 sm:grid-cols-2 lg:grid-cols-3"
				style={{
					gridAutoRows: `${CARD_HEIGHT}px`,
					rowGap: `${ROW_GAP}px`,
				}}
			>
				{children}
			</div>
		</div>
	);
}

type LibraryJournalGridProps = {
	storyTab: LibraryTab;
	journals: EnrichedJournal[];
	onOpenJournal: (journal: Doc<"journals">) => void;
	onAddEntry: (journal: Doc<"journals">) => void;
};

function SortableJournalCard({
	journal,
	onOpen,
	onAddEntry,
}: {
	journal: EnrichedJournal;
	onOpen: () => void;
	onAddEntry: () => void;
}) {
	const {
		attributes,
		listeners,
		setNodeRef,
		setActivatorNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: journal._id, resizeObserverConfig: {} });

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
	};

	return (
		<div
			ref={setNodeRef}
			style={style}
			className={cn("relative", isDragging && "z-10 opacity-60")}
		>
			{/* Only the handle opts out of browser panning; on the card itself it
			    would stop a phone from scrolling the page. */}
			<button
				type="button"
				ref={setActivatorNodeRef}
				className={cn(
					"absolute top-2 left-2 z-20 flex size-8 cursor-grab touch-none items-center justify-center rounded-lg bg-white/90 shadow-sm active:cursor-grabbing",
					"text-[#525252] hover:bg-white",
				)}
				aria-label={`Drag to reorder ${journal.title}`}
				{...attributes}
				{...listeners}
			>
				<GripVertical className="size-4" aria-hidden />
			</button>
			<JournalCard journal={journal} onOpen={onOpen} onAddEntry={onAddEntry} />
		</div>
	);
}

export function LibraryJournalGrid({
	storyTab,
	journals,
	onOpenJournal,
	onAddEntry,
}: LibraryJournalGridProps) {
	const reorderJournals = useMutation(api.journal.mutations.reorder);
	const [orderedIds, setOrderedIds] = useState<Id<"journals">[]>([]);

	useEffect(() => {
		setOrderedIds(journals.map((j) => j._id));
	}, [journals]);

	const sortedJournals = useMemo(() => {
		const byId = new Map(journals.map((j) => [j._id, j]));
		return orderedIds
			.map((id) => byId.get(id))
			.filter((j): j is EnrichedJournal => j !== undefined);
	}, [journals, orderedIds]);

	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: { distance: 8 },
		}),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	);

	const handleDragEnd = (event: DragEndEvent) => {
		const { active, over } = event;
		if (!over || active.id === over.id) return;

		const oldIndex = orderedIds.indexOf(active.id as Id<"journals">);
		const newIndex = orderedIds.indexOf(over.id as Id<"journals">);
		if (oldIndex < 0 || newIndex < 0) return;

		// Our Story mixes your journals with ones shared with you; its order is
		// not user-editable (the grid below doesn't render handles there).
		if (storyTab === "our_story") return;
		const nextOrder = arrayMove(orderedIds, oldIndex, newIndex);
		const previousOrder = orderedIds;
		setOrderedIds(nextOrder);

		reorderJournals({ type: storyTab, orderedIds: nextOrder }).catch((err) => {
			setOrderedIds(previousOrder);
			toastMutationError(err, "Could not save order. Please try again.");
		});
	};

	if (sortedJournals.length === 0) {
		return null;
	}

	if (storyTab === "our_story") {
		return (
			<ShelfGrid>
				{sortedJournals.map((journal) => (
					<JournalCard
						key={journal._id}
						journal={journal}
						onOpen={() => onOpenJournal(journal)}
						onAddEntry={() => onAddEntry(journal)}
					/>
				))}
			</ShelfGrid>
		);
	}

	return (
		<div className="flex w-full flex-col gap-3">
			<p className="text-[#8a8a8a] text-sm">
				Drag the handle on a journal to reorder your stories.
			</p>
			<DndContext
				sensors={sensors}
				collisionDetection={closestCenter}
				onDragEnd={handleDragEnd}
			>
				<SortableContext items={orderedIds} strategy={rectSortingStrategy}>
					<ShelfGrid>
						{sortedJournals.map((journal) => (
							<SortableJournalCard
								key={journal._id}
								journal={journal}
								onOpen={() => onOpenJournal(journal)}
								onAddEntry={() => onAddEntry(journal)}
							/>
						))}
					</ShelfGrid>
				</SortableContext>
			</DndContext>
		</div>
	);
}
