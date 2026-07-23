import { brand } from "@legacy-building/ui/lib/brand-journal";
import { cn } from "@legacy-building/ui/lib/utils";

export type EntryMode = "writing" | "recording" | "video";

/** Each mode owns an accent so the three tabs never read as the same control. */
const MODES: {
	id: EntryMode;
	label: string;
	active: string;
	inactive?: string;
}[] = [
	{ id: "writing", label: "Writing journal", active: brand.primary },
	{
		id: "recording",
		label: "Recording journal",
		active: brand.alert,
		inactive: brand.alertLight,
	},
	{
		id: "video",
		label: "Video journal",
		active: brand.video,
		inactive: brand.videoLight,
	},
];

type EntryModeTabsProps = {
	value: EntryMode;
	onChange: (mode: EntryMode) => void;
};

/** Bubble.io tab strip: one column per mode, 3px radius on the active tab. */
export function EntryModeTabs({ value, onChange }: EntryModeTabsProps) {
	return (
		<div
			className="mx-auto inline-grid min-w-[140px] grid-cols-3 gap-0"
			role="tablist"
			aria-label="Entry mode"
		>
			{MODES.map((option) => {
				const isActive = value === option.id;
				return (
					<button
						key={option.id}
						type="button"
						role="tab"
						aria-selected={isActive}
						onClick={() => onChange(option.id)}
						className={cn(
							"min-h-10 min-w-[170px] cursor-pointer self-start px-2.5 py-2.5 font-normal text-base leading-[1.4] transition-colors",
							isActive
								? "rounded-[3px] text-white"
								: option.inactive
									? "rounded-none text-[#1a1a1a]"
									: "rounded-none bg-white text-[#1a1a1a]",
						)}
						style={
							isActive
								? { backgroundColor: option.active }
								: option.inactive
									? { backgroundColor: option.inactive }
									: undefined
						}
					>
						{option.label}
					</button>
				);
			})}
		</div>
	);
}
