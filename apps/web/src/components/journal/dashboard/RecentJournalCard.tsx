import { brand } from "@legacy-building/ui/lib/brand-journal";
import { cn } from "@legacy-building/ui/lib/utils";
import { Plus } from "lucide-react";

import { ImageCarousel } from "@/components/journal/dashboard/ImageCarousel";
import {
	journalCardMediaWellClass,
	journalCardShellClass,
} from "@/components/journal/library/journalCardStyles";
import { Button } from "@/components/journal/ui/button";
import { formatDate } from "@/lib/journal/formatDate";

type RecentJournalCardProps = {
	title: string;
	dateMs: number;
	slideImageUrls: string[];
	className?: string;
	onOpenJournal: () => void;
	onAddEntry: () => void;
};

export function RecentJournalCard({
	title,
	dateMs,
	slideImageUrls,
	className,
	onOpenJournal,
	onAddEntry,
}: RecentJournalCardProps) {
	const openAddEntry = (e: React.MouseEvent) => {
		e.stopPropagation();
		onAddEntry();
	};

	return (
		<div
			className={cn("flex w-full max-w-[min(340px,100%)] flex-col", className)}
		>
			<h2 className="mb-2 text-center font-bold text-[#1a1a1a] text-[clamp(2.125rem,5.5vw,2.375rem)] leading-[1.4]">
				Recent Journal
			</h2>

			<div className={cn("flex w-full flex-col", journalCardShellClass)}>
				<div className={cn(journalCardMediaWellClass, "h-[150px]")}>
					<ImageCarousel
						imageUrls={slideImageUrls}
						alt={title}
						onImageAreaClick={onOpenJournal}
						className="size-full h-full"
					/>
				</div>

				<div
					className="flex items-center gap-2 px-3 py-3 sm:px-5"
					style={{ backgroundColor: brand.primary }}
				>
					<button
						type="button"
						onClick={onOpenJournal}
						className="min-w-0 flex-1 cursor-pointer rounded-md border-0 bg-transparent p-0 text-left transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground/60 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent active:scale-[0.98]"
					>
						<p className="truncate font-semibold text-lg text-white leading-[1.4]">
							{title}
						</p>
						<p
							className="font-normal text-sm leading-none"
							style={{ color: "rgba(255,255,255,0.85)" }}
						>
							{formatDate(dateMs)}
						</p>
					</button>

					<Button
						type="button"
						variant="ghost"
						size="icon"
						onClick={openAddEntry}
						className="size-10 shrink-0 rounded-full bg-white hover:bg-white hover:opacity-90"
						aria-label="Add journal entry"
					>
						<Plus
							className="size-5"
							style={{ color: brand.primary }}
							strokeWidth={2.5}
						/>
					</Button>
				</div>
			</div>
		</div>
	);
}
