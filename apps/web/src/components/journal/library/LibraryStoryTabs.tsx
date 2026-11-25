import { cn } from "@legacy-building/ui/lib/utils";
import { Tabs, TabsList, TabsTrigger } from "@/components/journal/ui/tabs";
import { LIBRARY_TABS, type LibraryTab } from "@/lib/journal/journalTypes";

type LibraryStoryTabsProps = {
	value: LibraryTab;
	onChange: (tab: LibraryTab) => void;
	className?: string;
};

/**
 * Segmented My Story | Their Story | Our Story control: a white tray with a
 * teal block on the active story (Figma library view). Three equal columns,
 * full width on phones and a fixed width from `sm` up; the page puts it on
 * the left. The tabs list base styles pin the height to 32px
 * (`group-data-horizontal/tabs:h-8`), so it is reset to `h-auto`, and the
 * line variant's `data-[variant=line]:rounded-none` is beaten by restating
 * the radius under the same selector.
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
			className={cn("w-full sm:w-auto sm:self-start", className)}
		>
			<TabsList
				variant="line"
				className="grid h-auto w-full grid-cols-3 gap-1 rounded-lg border border-primary/15 bg-background p-1 shadow-sm data-[variant=line]:rounded-lg group-data-horizontal/tabs:h-auto sm:w-[420px]"
			>
				{LIBRARY_TABS.map((tab) => (
					<TabsTrigger
						key={tab.id}
						value={tab.id}
						className={cn(
							"h-10 min-w-0 rounded-md border-0 px-2 font-medium text-sm leading-tight shadow-none after:hidden",
							"bg-transparent text-foreground hover:bg-primary/10 hover:text-foreground",
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
