import { brand } from "@legacy-building/ui/lib/brand-journal";
import { cn } from "@legacy-building/ui/lib/utils";
import { type LucideIcon, Mic, PenTool, Video } from "lucide-react";

export type EntryMode = "writing" | "recording" | "video";

type EntryModeTabsProps = {
	value: EntryMode;
	onChange: (mode: EntryMode) => void;
};

type ModeTab = {
	value: EntryMode;
	label: string;
	Icon: LucideIcon;
	accent: string;
};

/** Each medium owns an accent: teal writing, amber audio, red video. */
const MODE_TABS: readonly ModeTab[] = [
	{ value: "writing", label: "Writing", Icon: PenTool, accent: brand.primary },
	{ value: "recording", label: "Recording", Icon: Mic, accent: brand.alert },
	{ value: "video", label: "Video", Icon: Video, accent: brand.video },
];

/**
 * Writing | Recording | Video switcher.
 *
 * Three tabs rather than two: video used to hide behind a "Journal type"
 * select once Recording was active, which buried a top-level choice.
 */
export function EntryModeTabs({ value, onChange }: EntryModeTabsProps) {
	return (
		<div
			className="inline-flex w-full max-w-[560px] rounded-[12px] border border-[#e9ecef] bg-white p-1 shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
			role="tablist"
			aria-label="Entry mode"
		>
			{MODE_TABS.map(({ value: mode, label, Icon, accent }) => {
				const active = value === mode;
				return (
					<button
						key={mode}
						type="button"
						role="tab"
						aria-selected={active}
						onClick={() => onChange(mode)}
						className={cn(
							"flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-[8px] px-2 py-2.5 text-center font-bold text-xs leading-5 transition-colors sm:gap-2 sm:px-4 sm:text-sm",
							active && "text-white",
						)}
						style={active ? { backgroundColor: accent } : { color: accent }}
					>
						<Icon className="size-4 shrink-0" strokeWidth={2} aria-hidden />
						{label}
					</button>
				);
			})}
		</div>
	);
}
