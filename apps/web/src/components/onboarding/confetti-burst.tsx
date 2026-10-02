import { cn } from "@legacy-building/ui/lib/utils";
import { motion, useReducedMotion } from "motion/react";
import { useMemo } from "react";

const PIECE_COUNT = 70;

/** Bright multicolour palette from the Figma confetti artwork. */
const PIECE_COLORS = [
	"bg-onb-confetti-1",
	"bg-onb-confetti-2",
	"bg-onb-confetti-3",
	"bg-onb-confetti-4",
	"bg-onb-confetti-5",
	"bg-onb-confetti-6",
	"bg-onb-confetti-7",
];

/**
 * Celebratory burst for the completion screens: small bright rectangles (and a
 * few thin slivers) falling over the whole page, as in the design.
 *
 * Built on motion rather than a confetti package — it is a few dozen spans and
 * the dependency is already here for the step transitions.
 */
export function ConfettiBurst() {
	const reducedMotion = useReducedMotion();

	const pieces = useMemo(
		() =>
			Array.from({ length: PIECE_COUNT }, (_, index) => {
				const sliver = index % 5 === 0;
				return {
					key: `piece-${index}`,
					color:
						PIECE_COLORS[index % PIECE_COLORS.length] ?? "bg-onb-confetti-1",
					left: Math.random() * 100,
					drift: (Math.random() - 0.5) * 140,
					delay: Math.random() * 0.9,
					duration: 2.6 + Math.random() * 1.6,
					width: sliver ? 2 : 4 + Math.random() * 4,
					height: sliver ? 10 + Math.random() * 6 : 8 + Math.random() * 8,
					spin: (Math.random() - 0.5) * 900,
				};
			}),
		[],
	);

	// A falling-objects animation is exactly what this setting is meant to stop.
	if (reducedMotion) return null;

	return (
		<div
			className="pointer-events-none fixed inset-0 z-50 overflow-hidden"
			aria-hidden="true"
		>
			{pieces.map((piece) => (
				<motion.span
					key={piece.key}
					className={cn("absolute block rounded-[1px]", piece.color)}
					style={{
						left: `${piece.left}%`,
						top: -24,
						width: piece.width,
						height: piece.height,
					}}
					initial={{ y: 0, x: 0, rotate: 0, opacity: 1 }}
					animate={{
						y: "105vh",
						x: piece.drift,
						rotate: piece.spin,
						opacity: [1, 1, 0],
					}}
					transition={{
						duration: piece.duration,
						delay: piece.delay,
						ease: "easeIn",
						opacity: { times: [0, 0.8, 1], duration: piece.duration },
					}}
				/>
			))}
		</div>
	);
}
