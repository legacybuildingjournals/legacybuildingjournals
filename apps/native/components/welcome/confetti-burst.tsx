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

const PIECE_COUNT = 24;
const FALL_MS = 2200;

/** Chip tints double as the confetti palette so the burst stays on-theme. */
const PIECE_CLASSES = [
	"bg-chip-1",
	"bg-chip-2",
	"bg-chip-3",
	"bg-chip-4",
	"bg-chip-5",
	"bg-primary",
];

type Piece = {
	key: string;
	className: string;
	startX: number;
	drift: number;
	delay: number;
	size: number;
	spin: number;
	rounded: boolean;
};

function Confetti({ piece, height }: { piece: Piece; height: number }) {
	const progress = useSharedValue(0);

	useEffect(() => {
		progress.value = withDelay(
			piece.delay,
			withTiming(1, { duration: FALL_MS, easing: Easing.out(Easing.quad) }),
		);
	}, [progress, piece.delay]);

	const style = useAnimatedStyle(() => ({
		transform: [
			{ translateY: progress.value * height },
			{ translateX: progress.value * piece.drift },
			{ rotate: `${progress.value * piece.spin}deg` },
		],
		// Hold full opacity most of the way, then fade out near the floor.
		opacity: progress.value > 0.75 ? (1 - progress.value) * 4 : 1,
	}));

	return (
		<AnimatedView
			className={`absolute ${piece.className} ${piece.rounded ? "rounded-full" : "rounded-[2px]"}`}
			style={[
				{ left: piece.startX, top: -24, width: piece.size, height: piece.size },
				style,
			]}
		/>
	);
}

/**
 * Short celebratory burst for the end of onboarding.
 *
 * Hand-rolled on Reanimated, which is already installed and Metro-configured,
 * rather than pulling in a confetti package for one screen.
 */
export function ConfettiBurst() {
	const { width, height } = useWindowDimensions();

	const pieces = useMemo<Piece[]>(
		() =>
			Array.from({ length: PIECE_COUNT }, (_, index) => ({
				key: `piece-${index}`,
				className: PIECE_CLASSES[index % PIECE_CLASSES.length] ?? "bg-primary",
				startX: Math.random() * width,
				drift: (Math.random() - 0.5) * 120,
				delay: Math.random() * 600,
				size: 7 + Math.random() * 7,
				spin: (Math.random() - 0.5) * 720,
				rounded: index % 3 === 0,
			})),
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
