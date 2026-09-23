import type { QuestionOption } from "@legacy-building/backend/convex/onboarding/questions";
import { cn } from "@legacy-building/ui/lib/utils";
import { ChevronRight } from "lucide-react";

import { ONBOARDING_ICONS } from "@/lib/onboarding/icons";

/** Tint id -> chip classes, written out so Tailwind can extract them. */
const CHIP_CLASS: Record<string, string> = {
	"chip-1": "bg-chip-1 text-chip-1-foreground",
	"chip-2": "bg-chip-2 text-chip-2-foreground",
	"chip-3": "bg-chip-3 text-chip-3-foreground",
	"chip-4": "bg-chip-4 text-chip-4-foreground",
	"chip-5": "bg-chip-5 text-chip-5-foreground",
};

type OnboardingOptionRowProps = {
	option: QuestionOption;
	selected: boolean;
	disabled: boolean;
	onSelect: () => void;
};

export function OnboardingOptionRow({
	option,
	selected,
	disabled,
	onSelect,
}: OnboardingOptionRowProps) {
	const Icon = ONBOARDING_ICONS[option.icon];

	return (
		<button
			type="button"
			onClick={onSelect}
			disabled={disabled}
			aria-pressed={selected}
			className={cn(
				"flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-all lg:gap-4",
				// Roomier only when the window is tall enough to afford it — the
				// six-option questions must keep every option above the fold.
				"lg:[@media(min-height:900px)]:p-4",
				"hover:shadow-sm active:scale-[0.99]",
				"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
				"disabled:pointer-events-none disabled:opacity-60",
				selected
					? "border-primary bg-primary text-primary-foreground"
					: "border-border bg-card hover:bg-accent/40",
			)}
		>
			<span
				className={cn(
					"flex size-11 shrink-0 items-center justify-center rounded-full transition-colors",
					selected
						? "bg-primary-foreground/20 text-primary-foreground"
						: (CHIP_CLASS[option.tint] ?? "bg-muted text-muted-foreground"),
				)}
			>
				<Icon className="size-5" aria-hidden="true" />
			</span>

			<span className="flex-1 text-[15px] leading-snug sm:text-base">
				{option.label}
			</span>

			<ChevronRight
				className={cn(
					"size-4 shrink-0 transition-transform",
					selected ? "text-primary-foreground" : "text-muted-foreground",
				)}
				aria-hidden="true"
			/>
		</button>
	);
}
