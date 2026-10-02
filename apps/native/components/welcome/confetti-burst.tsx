import { useEffect, useMemo } from "react";
import { useWindowDimensions, View } from "react-native";
import Animated, {
	Easing,
	useAnimatedStyle,
	useSharedValue,
	withDelay,
	withTiming,
} from "react-native-reanimated";

const AnimatedView = Animated.createAnimatedComponent(View);

const PIECE_COUNT = 56;
const FALL_MS = 2600;

/** Bright multicolour palette from the Figma confetti artwork. */
const PIECE_CLASSES = [
	"bg-onb-confetti-1",
	"bg-onb-confetti-2",
	"bg-onb-confetti-3",
	"bg-onb-confetti-4",
	"bg-onb-confetti-5",
	"bg-onb-confetti-6",
	"bg-onb-confetti-7",
];

type Piece = {
	key: string;
	className: string;
	startX: number;
	drift: number;
	delay: number;
	width: number;
	height: number;
	spin: number;
};

function Confetti({ piece, height }: { piece: Piece; height: number }) {
	const progress = useSharedValue(0);

	useEffect(() => {
		progress.value = withDelay(
			piece.delay,
			withTiming(1, { duration: FALL_MS, easing: Easing.in(Easing.quad) }),
		);
	}, [progress, piece.delay]);

	const style = useAnimatedStyle(() => ({
		transform: [
			{ translateY: progress.value * height },
			{ translateX: progress.value * piece.drift },
			{ rotate: `${progress.value * piece.spin}deg` },
		],
		// Hold full opacity most of the way, then fade out near the floor.
		opacity: progress.value > 0.8 ? (1 - progress.value) * 5 : 1,
	}));

	return (
		<AnimatedView
			className={`absolute rounded-[1px] ${piece.className}`}
			style={[
				{
					left: piece.startX,
					top: -24,
					width: piece.width,
					height: piece.height,
				},
				style,
			]}
		/>
	);
}

/**
 * Short celebratory burst for the end of onboarding: small bright rectangles and
 * a few thin slivers, as in the design. Hand-rolled on Reanimated, which is
 * already installed, rather than pulling in a confetti package for one screen.
 */
export function ConfettiBurst() {
	const { width, height } = useWindowDimensions();

	const pieces = useMemo<Piece[]>(
		() =>
			Array.from({ length: PIECE_COUNT }, (_, index) => {
				const sliver = index % 5 === 0;
				return {
					key: `piece-${index}`,
					className:
						PIECE_CLASSES[index % PIECE_CLASSES.length] ?? "bg-onb-confetti-1",
					startX: Math.random() * width,
					drift: (Math.random() - 0.5) * 120,
					delay: Math.random() * 700,
					width: sliver ? 2 : 4 + Math.random() * 4,
					height: sliver ? 10 + Math.random() * 6 : 8 + Math.random() * 8,
					spin: (Math.random() - 0.5) * 720,
				};
			}),
		[width],
	);

	return (
		<View
			pointerEvents="none"
			className="absolute inset-0 overflow-hidden"
			accessibilityElementsHidden
			importantForAccessibility="no-hide-descendants"
		>
			{pieces.map((piece) => (
				<Confetti key={piece.key} piece={piece} height={height + 48} />
			))}
		</View>
	);
}
