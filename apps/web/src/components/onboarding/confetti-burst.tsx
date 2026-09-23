import { cn } from "@legacy-building/ui/lib/utils";
import { motion, useReducedMotion } from "motion/react";
import { useMemo } from "react";

const PIECE_COUNT = 28;

/** Chip tints double as the confetti palette so the burst stays on-theme. */
const PIECE_CLASSES = [
	"bg-chip-1",
	"bg-chip-2",
	"bg-chip-3",
	"bg-chip-4",
	"bg-chip-5",
	"bg-primary",
];

/**
 * Short celebratory burst for the end of onboarding, mirroring the native
 * `ConfettiBurst`. Built on motion rather than a confetti package — it's a few
 * dozen divs and the dependency is already here for the step transitions.
 */
export function ConfettiBurst() {
	const reducedMotion = useReducedMotion();

	const pieces = useMemo(
		() =>
			Array.from({ length: PIECE_COUNT }, (_, index) => ({
				key: `piece-${index}`,
				className: PIECE_CLASSES[index % PIECE_CLASSES.length] ?? "bg-primary",
				left: Math.random() * 100,
				drift: (Math.random() - 0.5) * 160,
				delay: Math.random() * 0.5,
				duration: 2.2 + Math.random() * 1.1,
				size: 7 + Math.random() * 7,
				spin: (Math.random() - 0.5) * 720,
				round: index % 3 === 0,
			})),
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
					className={cn(
						"absolute block",
						piece.className,
						piece.round ? "rounded-full" : "rounded-[2px]",
					)}
					style={{
						left: `${piece.left}%`,
						top: -24,
						width: piece.size,
						height: piece.size,
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
						opacity: { times: [0, 0.75, 1], duration: piece.duration },
					}}
				/>
			))}
		</div>
	);
}
