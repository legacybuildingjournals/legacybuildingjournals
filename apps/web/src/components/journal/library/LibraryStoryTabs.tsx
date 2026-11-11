import { cn } from "@legacy-building/ui/lib/utils";
import { Tabs, TabsList, TabsTrigger } from "@/components/journal/ui/tabs";
import { LIBRARY_TABS, type LibraryTab } from "@/lib/journal/journalTypes";

type LibraryStoryTabsProps = {
	value: LibraryTab;
	onChange: (tab: LibraryTab) => void;
	className?: string;
};

/**
 * Segmented My Story | Their Story | Our Story control. Three equal columns:
 * full width on phones, fixed-width segments from `sm` up. The tabs list base
 * styles pin the height to 32px (`group-data-horizontal/tabs:h-8`), which
 * clipped the 48px segments and produced an inner scrollbar, so it is reset
 * to `h-auto` here.
 */
export function LibraryStoryTabs({
	value,
	onChange,
	className,
}: LibraryStoryTabsProps) {
	return (
		<Tabs
			value={value}
			onValueChange={(next) => onChange(next as LibraryTab)}
			aria-label="Story type"
			className={cn("w-full sm:w-auto sm:self-center", className)}
		>
			<TabsList
				variant="line"
				className="grid h-auto w-full grid-cols-3 gap-0 overflow-hidden rounded-full border border-primary/15 bg-background p-0 shadow-sm group-data-horizontal/tabs:h-auto sm:w-[480px] lg:w-[540px]"
			>
				{LIBRARY_TABS.map((tab) => (
					<TabsTrigger
						key={tab.id}
						value={tab.id}
						className={cn(
							"h-12 min-w-0 rounded-none border-0 px-2 font-medium text-[15px] leading-tight shadow-none after:hidden sm:text-base",
							"bg-primary/10 text-foreground hover:bg-primary/20 hover:text-foreground",
							"data-[state=active]:!bg-primary data-[state=active]:!text-primary-foreground",
							"transition-[background-color,color,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset active:scale-[0.98]",
						)}
					>
						{tab.label}
					</TabsTrigger>
				))}
			</TabsList>
		</Tabs>
	);
}
