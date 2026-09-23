import type { Question } from "@legacy-building/backend/convex/onboarding/questions";
import { TOTAL_QUESTIONS } from "@legacy-building/backend/convex/onboarding/questions";
import { cn } from "@legacy-building/ui/lib/utils";
import { ChevronLeft } from "lucide-react";
import { motion } from "motion/react";

import { OnboardingOptionRow } from "./onboarding-option-row";

/** Fixed-length and never reordered, so stable ids beat array indices as keys. */
const PROGRESS_SEGMENTS = Array.from(
	{ length: TOTAL_QUESTIONS },
	(_, index) => `segment-${index + 1}`,
);

type OnboardingQuestionStepProps = {
	question: Question;
	/** 1-based position, for "N of 7". */
	index: number;
	selectedOptionId?: string;
	busy: boolean;
	onSelect: (optionId: string) => void;
	onBack?: () => void;
};

export function OnboardingQuestionStep({
	question,
	index,
	selectedOptionId,
	busy,
	onSelect,
	onBack,
}: OnboardingQuestionStepProps) {
	return (
		<div className="flex w-full flex-1 flex-col gap-4">
			<div className="flex h-9 items-center justify-between">
				{onBack ? (
					<button
						type="button"
						onClick={onBack}
						disabled={busy}
						className="-ml-2 flex items-center gap-1 rounded-full px-2 py-1 text-foreground text-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98] disabled:opacity-40"
					>
						<ChevronLeft className="size-4" aria-hidden="true" />
						Back
					</button>
				) : (
					<span />
				)}

				<span className="text-muted-foreground text-sm">
					{index} of {TOTAL_QUESTIONS}
				</span>
			</div>

			<div
				className="flex gap-1.5"
				role="progressbar"
				aria-valuemin={0}
				aria-valuemax={TOTAL_QUESTIONS}
				aria-valuenow={index}
				aria-label={`Question ${index} of ${TOTAL_QUESTIONS}`}
			>
				{PROGRESS_SEGMENTS.map((segment, position) => (
					<span
						key={segment}
						className={cn(
							"h-1.5 flex-1 rounded-full transition-colors",
							position < index ? "bg-primary" : "bg-border",
						)}
					/>
				))}
			</div>

			{/* Keyed so each question animates in on mount. Deliberately no
			    AnimatePresence: `mode="wait"` plays exit *then* enter, which doubles
			    the gap on every tap across a seven-step flow. */}
			<motion.div
				key={question.id}
				initial={{ opacity: 0, x: 16 }}
				animate={{ opacity: 1, x: 0 }}
				transition={{ duration: 0.18, ease: "easeOut" }}
				className="flex flex-1 flex-col gap-3"
			>
				{question.eyebrow ? (
					<p className="font-medium text-muted-foreground text-xs tracking-[0.12em]">
						{question.eyebrow}
					</p>
				) : null}

				<h1 className="font-semibold text-2xl text-foreground leading-tight sm:text-3xl">
					{question.prompt}
				</h1>

				{question.helper ? (
					<p className="text-muted-foreground text-sm sm:text-base">
						{question.helper}
					</p>
				) : null}

				<div className="mt-2 flex flex-col gap-2.5 lg:[@media(min-height:900px)]:mt-4 lg:[@media(min-height:900px)]:gap-3.5">
					{question.options.map((option) => (
						<OnboardingOptionRow
							key={option.id}
							option={option}
							selected={selectedOptionId === option.id}
							disabled={busy}
							onSelect={() => onSelect(option.id)}
						/>
					))}
				</div>

				{question.footer ? (
					<p className="mt-3 rounded-2xl bg-primary/10 p-4 text-center text-primary text-sm">
						{question.footer}
					</p>
				) : null}
			</motion.div>
		</div>
	);
}
