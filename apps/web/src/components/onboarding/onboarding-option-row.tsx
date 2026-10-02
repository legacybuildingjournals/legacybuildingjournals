import type { QuestionOption } from "@legacy-building/backend/convex/onboarding/questions";
import { cn } from "@legacy-building/ui/lib/utils";
import { ChevronRight } from "lucide-react";

import { ONBOARDING_ICONS } from "@/lib/onboarding/icons";

/**
 * Chip colours follow the row's position, not its meaning — that is how the
 * Figma designs assign them. Spelled out so Tailwind can see every class.
 */
const CHIP_BG = [
	"bg-onb-chip-1",
	"bg-onb-chip-2",
	"bg-onb-chip-3",
	"bg-onb-chip-4",
	"bg-onb-chip-5",
	"bg-onb-chip-6",
] as const;

const CHIP_FG = [
	"text-onb-chip-fg-1",
	"text-onb-chip-fg-2",
	"text-onb-chip-fg-3",
	"text-onb-chip-fg-4",
	"text-onb-chip-fg-5",
	"text-onb-chip-fg-6",
] as const;

type OnboardingOptionRowProps = {
	option: QuestionOption;
	/** Zero-based position in the list. */
	index: number;
	selected: boolean;
	disabled: boolean;
	onSelect: () => void;
};

export function OnboardingOptionRow({
	option,
	index,
	selected,
	disabled,
	onSelect,
}: OnboardingOptionRowProps) {
	const Icon = ONBOARDING_ICONS[option.icon];
	const slot = index % CHIP_BG.length;

	return (
		<button
			type="button"
			onClick={onSelect}
			disabled={disabled}
			aria-pressed={selected}
			className={cn(
				"flex w-full items-center justify-between rounded-[12px] border border-transparent px-[17px] py-[15px] text-left",
				"shadow-[0_1px_1.5px_rgba(0,0,0,0.04)] transition-all",
				"hover:-translate-y-px hover:shadow-[0_6px_16px_-6px_rgba(11,48,42,0.18)] active:translate-y-0 active:scale-[0.99]",
				"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-onb-teal focus-visible:ring-offset-2",
				"disabled:pointer-events-none disabled:opacity-60",
				selected ? "bg-onb-selected text-white" : "bg-white text-onb-text",
			)}
		>
			<span className="flex min-w-0 items-center gap-4">
				<span
					className={cn(
						"flex size-10 shrink-0 items-center justify-center rounded-full transition-colors",
						selected
							? "bg-white/20 text-white"
							: cn(CHIP_BG[slot], CHIP_FG[slot]),
					)}
				>
					<Icon size={20} aria-hidden="true" />
				</span>
				<span className="text-[15px] leading-5">{option.label}</span>
			</span>

			<ChevronRight
				size={16}
				strokeWidth={2.5}
				aria-hidden="true"
				className={cn(
					"ml-2 shrink-0",
					selected ? "text-white" : "text-onb-chevron",
				)}
			/>
		</button>
	);
}
