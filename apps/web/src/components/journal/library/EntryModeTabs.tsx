import { brand } from "@legacy-building/ui/lib/brand-journal";
import { cn } from "@legacy-building/ui/lib/utils";

export type EntryMode = "writing" | "recording" | "video";

type EntryModeTabsProps = {
	value: EntryMode;
	onChange: (mode: EntryMode) => void;
	/**
	 * Fill for the active Recording tab. Audio and video are both "recording"
	 * here — which one is chosen shows in the Journal type select, not the tab —
	 * so the tab takes whichever accent the current medium owns.
	 */
	accent: string;
};

const tabClass =
	"min-w-[150px] cursor-pointer rounded-[8px] px-6 py-2.5 text-center font-bold text-sm leading-5 transition-colors";

/**
 * Writing | Recording switcher.
 *
 * Two tabs rather than three: video is a kind of recording, picked from the
 * Journal type select once Recording is active.
 */
export function EntryModeTabs({ value, onChange, accent }: EntryModeTabsProps) {
	const isWriting = value === "writing";

	return (
		<div
			className="inline-flex rounded-[12px] border border-[#e9ecef] bg-white p-1 shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
			role="tablist"
			aria-label="Entry mode"
		>
			<button
				type="button"
				role="tab"
				aria-selected={isWriting}
				onClick={() => onChange("writing")}
				className={cn(tabClass, isWriting && "text-white")}
				style={
					isWriting
						? { backgroundColor: brand.primary }
						: { color: brand.primary }
				}
			>
				Writing Journal
			</button>

			<button
				type="button"
				role="tab"
				aria-selected={!isWriting}
				// Coming from Writing there is no medium yet, so default to audio.
				onClick={() => onChange(value === "video" ? "video" : "recording")}
				className={cn(tabClass, !isWriting ? "text-white" : "text-[#6c757d]")}
				style={!isWriting ? { backgroundColor: accent } : undefined}
			>
				Recording Journal
			</button>
		</div>
	);
}
