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

/** One question screen, laid out to the spacing in the Figma `Partner_Q2` frame. */
export function OnboardingQuestionStep({
	question,
	index,
	selectedOptionId,
	busy,
	onSelect,
	onBack,
}: OnboardingQuestionStepProps) {
	return (
		<div className="flex w-full flex-col">
			<div className="flex flex-col gap-3 pb-3">
				<div className="flex items-center justify-between">
					{onBack ? (
						<button
							type="button"
							onClick={onBack}
							disabled={busy}
							className="-ml-1 flex items-center rounded-md py-1 pr-2 pl-1 text-[14px] text-onb-back leading-5 transition-colors hover:bg-white/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-onb-teal active:scale-[0.98] disabled:opacity-40"
						>
							<ChevronLeft
								size={16}
								strokeWidth={2.5}
								aria-hidden="true"
								className="mr-1"
							/>
							Back
						</button>
					) : (
						<span />
					)}
					<span className="text-[14px] text-onb-muted leading-5">
						{index} of {TOTAL_QUESTIONS}
					</span>
				</div>

				<div
					className="flex h-1 gap-[10px]"
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
								"h-1 flex-1 rounded-full transition-colors",
								position < index
									? "bg-onb-progress"
									: "bg-onb-progress-pending",
							)}
						/>
					))}
				</div>
			</div>

			{/* Keyed so each question animates in on mount. Deliberately no
			    AnimatePresence: `mode="wait"` plays exit *then* enter, which doubles
			    the gap on every tap across a seven-step flow. */}
			<motion.div
				key={question.id}
				initial={{ opacity: 0, x: 16 }}
				animate={{ opacity: 1, x: 0 }}
				transition={{ duration: 0.18, ease: "easeOut" }}
				className="flex flex-col gap-[7px] pt-4"
			>
				{question.eyebrow ? (
					<p className="font-bold text-[11px] text-onb-eyebrow uppercase leading-[16.5px] tracking-[0.55px]">
						{question.eyebrow}
					</p>
				) : null}

				<h1 className="font-extrabold text-[22px] text-onb-ink leading-[30px] tracking-[-0.55px] sm:text-[27px] sm:leading-[37.13px] sm:tracking-[-0.675px]">
					{question.prompt}
				</h1>

				{question.helper ? (
					<p className="pt-px font-medium text-[14.5px] text-onb-muted leading-5">
						{question.helper}
					</p>
				) : null}

				<div className="flex flex-col gap-3 pt-[17px]">
					{question.options.map((option, position) => (
						<OnboardingOptionRow
							key={option.id}
							option={option}
							index={position}
							selected={selectedOptionId === option.id}
							disabled={busy}
							onSelect={() => onSelect(option.id)}
						/>
					))}
				</div>

				{question.footer ? (
					<p className="mt-3 rounded-2xl bg-onb-footer-bg px-4 py-4 text-center text-[13px] text-onb-footer-text">
						{question.footer}
					</p>
				) : null}
			</motion.div>
		</div>
	);
}
