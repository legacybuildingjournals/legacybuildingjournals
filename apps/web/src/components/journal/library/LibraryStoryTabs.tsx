import { cn } from "@legacy-building/ui/lib/utils";
import { Tabs, TabsList, TabsTrigger } from "@/components/journal/ui/tabs";
import { LIBRARY_TABS, type LibraryTab } from "@/lib/journal/journalTypes";

type LibraryStoryTabsProps = {
	value: LibraryTab;
	onChange: (tab: LibraryTab) => void;
};

const triggerBase =
	"h-auto min-h-[40px] min-w-[104px] shrink-0 sm:min-w-[150px] lg:min-w-[170px] rounded-none border-0 p-2.5 text-base font-normal leading-[1.4] shadow-none transition-[color,transform] after:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98]";

const triggerInactive =
	"bg-[#ebf6f6] text-[#1a1a1a] data-[state=inactive]:bg-[#ebf6f6] data-[state=inactive]:text-[#1a1a1a]";

const triggerActive =
	"data-[state=active]:!bg-[#008080] data-[state=active]:!text-white";

export function LibraryStoryTabs({ value, onChange }: LibraryStoryTabsProps) {
	return (
		<Tabs
			value={value}
			onValueChange={(next) => onChange(next as LibraryTab)}
			aria-label="Story type"
		>
			<TabsList
				variant="line"
				className="h-auto w-max max-w-full gap-0 overflow-x-auto rounded-xl bg-transparent p-0"
			>
				{LIBRARY_TABS.map((tab, index) => {
					const isFirst = index === 0;
					const isLast = index === LIBRARY_TABS.length - 1;
					return (
						<TabsTrigger
							key={tab.id}
							value={tab.id}
							className={cn(
								triggerBase,
								triggerInactive,
								triggerActive,
								isFirst && "rounded-l-xl",
								isLast && "rounded-r-xl",
							)}
						>
							{tab.label}
						</TabsTrigger>
					);
				})}
			</TabsList>
		</Tabs>
	);
}
