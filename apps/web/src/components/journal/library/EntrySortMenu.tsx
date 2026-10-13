import {
	ENTRY_SORT_KEYS,
	ENTRY_SORTS,
	type EntrySortKey,
} from "@legacy-building/backend/convex/journal/sort";
import { cn } from "@legacy-building/ui/lib/utils";
import { Check, ListFilter } from "lucide-react";
import { Fragment } from "react";

import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/journal/ui/popover";

type EntrySortMenuProps = {
	value: EntrySortKey;
	onChange: (value: EntrySortKey) => void;
	disabled?: boolean;
};

/**
 * Picks the order of the entry list.
 *
 * Only the list: the export and the printed book are always bound oldest
 * journal date first, whatever is selected here.
 */
export function EntrySortMenu({
	value,
	onChange,
	disabled = false,
}: EntrySortMenuProps) {
	return (
		<Popover>
			<PopoverTrigger asChild>
				<button
					type="button"
					disabled={disabled}
					aria-label={`Sort entries. Currently ${ENTRY_SORTS[value].group}, ${ENTRY_SORTS[value].label}`}
					className={cn(
						"flex size-8 items-center justify-center rounded-full text-[#525252]",
						"transition-all hover:bg-[#ececec] hover:text-[#1a1a1a]",
						"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#008080]",
						"active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40",
					)}
				>
					<ListFilter className="size-4" aria-hidden="true" />
				</button>
			</PopoverTrigger>

			<PopoverContent align="end" className="w-56 p-1.5">
				{ENTRY_SORT_KEYS.map((key, index) => {
					const option = ENTRY_SORTS[key];
					const previous = index > 0 ? ENTRY_SORT_KEYS[index - 1] : undefined;
					const startsGroup =
						previous === undefined ||
						ENTRY_SORTS[previous].group !== option.group;

					return (
						<Fragment key={key}>
							{startsGroup ? (
								<p
									className={cn(
										"px-2 pb-1 font-medium text-[#8a8a8a] text-xs",
										index > 0 && "mt-1 border-[#ececec] border-t pt-2",
									)}
								>
									{option.group}
								</p>
							) : null}
							<button
								type="button"
								onClick={() => onChange(key)}
								aria-pressed={value === key}
								className={cn(
									"flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm",
									"transition-colors hover:bg-[#f2f2f2]",
									"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#008080]",
									value === key ? "text-[#1a1a1a]" : "text-[#525252]",
								)}
							>
								{option.label}
								{value === key ? (
									<Check
										className="size-4 shrink-0 text-[#008080]"
										aria-hidden="true"
									/>
								) : null}
							</button>
						</Fragment>
					);
				})}
			</PopoverContent>
		</Popover>
	);
}
