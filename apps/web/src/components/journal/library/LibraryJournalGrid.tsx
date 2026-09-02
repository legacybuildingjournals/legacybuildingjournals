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
import { useEffect, useMemo, useState } from "react";
import { JournalCard } from "@/components/journal/library/JournalCard";
import type { StoryTab } from "@/lib/journal/journalTypes";
import { toastMutationError } from "@/lib/journal/toast";

type EnrichedJournal = Doc<"journals"> & { coverImageUrl?: string };

/**
 * Bookshelf rhythm. Every card is locked to CARD_HEIGHT and every grid row to
 * CARD_HEIGHT + ROW_GAP, so a shelf ledge — drawn to match the painted-cream
 * shelves in the library background photo — can be repeated as the grid
 * background exactly under each row of cards, at any width or scroll position.
 */
const CARD_HEIGHT = 224;
const ROW_GAP = 92;
const SHELF_PITCH = CARD_HEIGHT + ROW_GAP;
const SHELF_LEDGE = `linear-gradient(to bottom,
	rgba(0,0,0,0) 0,
	rgba(0,0,0,0) ${CARD_HEIGHT - 1}px,
	rgba(255,255,255,0.75) ${CARD_HEIGHT}px,
	#f4ede4 ${CARD_HEIGHT + 2}px,
	#ede2d4 ${CARD_HEIGHT + 9}px,
	#dfccb8 ${CARD_HEIGHT + 12}px,
	#cdb79f ${CARD_HEIGHT + 20}px,
	rgba(120,96,68,0.28) ${CARD_HEIGHT + 23}px,
	rgba(120,96,68,0.12) ${CARD_HEIGHT + 34}px,
	rgba(120,96,68,0) ${CARD_HEIGHT + 52}px,
	rgba(0,0,0,0) ${SHELF_PITCH}px)`;

type LibraryJournalGridProps = {
	storyTab: StoryTab;
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
			className={cn("relative touch-none", isDragging && "z-10 opacity-60")}
		>
			<button
				type="button"
				ref={setActivatorNodeRef}
				className={cn(
					"absolute top-2 left-2 z-20 flex size-8 cursor-grab items-center justify-center rounded-lg bg-white/90 shadow-sm active:cursor-grabbing",
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
					<div
						className="grid w-full grid-cols-1 gap-x-5 pb-16 sm:grid-cols-2 lg:grid-cols-3"
						style={{
							gridAutoRows: `${CARD_HEIGHT}px`,
							rowGap: `${ROW_GAP}px`,
							backgroundImage: SHELF_LEDGE,
							backgroundSize: `100% ${SHELF_PITCH}px`,
							backgroundRepeat: "repeat-y",
						}}
					>
						{sortedJournals.map((journal) => (
							<SortableJournalCard
								key={journal._id}
								journal={journal}
								onOpen={() => onOpenJournal(journal)}
								onAddEntry={() => onAddEntry(journal)}
							/>
						))}
					</div>
				</SortableContext>
			</DndContext>
		</div>
	);
}
