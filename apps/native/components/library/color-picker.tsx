import {
	clamp01,
	formatHsl,
	formatRgb,
	type Hsv,
	hsvToRgb,
	hueColor,
	parseColor,
	type Rgba,
	rgbaToHex,
	rgbToHsv,
} from "@legacy-building/ui/lib/color";
import { useThemeColor } from "heroui-native/hooks";
import { useCallback, useMemo, useRef, useState } from "react";
import {
	type LayoutChangeEvent,
	PanResponder,
	Pressable,
	Text,
	TextInput,
	View,
} from "react-native";
import Svg, {
	Defs,
	LinearGradient,
	Pattern,
	Rect,
	Stop,
} from "react-native-svg";

const HANDLE = 22;
const SQUARE_HEIGHT = 190;
const SLIDER_HEIGHT = 22;

type Format = "hex" | "rgb" | "hsl";
const FORMATS: Format[] = ["hex", "rgb", "hsl"];

type DragTarget = {
	/** Fractions of the track/box, already clamped to 0–1. */
	x: number;
	y: number;
};

/**
 * Runs a pan gesture over a laid-out box and reports normalised coordinates.
 * PanResponder is used rather than gesture-handler so the picker works inside a
 * plain RN Modal without extra provider setup.
 */
function useDragTracker(onMove: (point: DragTarget) => void) {
	const size = useRef({ width: 1, height: 1 });
	const onMoveRef = useRef(onMove);
	onMoveRef.current = onMove;

	const onLayout = useCallback((event: LayoutChangeEvent) => {
		const { width, height } = event.nativeEvent.layout;
		size.current = { width: Math.max(width, 1), height: Math.max(height, 1) };
	}, []);

	const responder = useMemo(
		() =>
			PanResponder.create({
				onStartShouldSetPanResponder: () => true,
				onMoveShouldSetPanResponder: () => true,
				onPanResponderTerminationRequest: () => false,
				onPanResponderGrant: (event) => {
					onMoveRef.current({
						x: clamp01(event.nativeEvent.locationX / size.current.width),
						y: clamp01(event.nativeEvent.locationY / size.current.height),
					});
				},
				onPanResponderMove: (event) => {
					onMoveRef.current({
						x: clamp01(event.nativeEvent.locationX / size.current.width),
						y: clamp01(event.nativeEvent.locationY / size.current.height),
					});
				},
			}),
		[],
	);

	return { onLayout, panHandlers: responder.panHandlers };
}

function Handle({
	left,
	top,
	color,
}: {
	left: `${number}%`;
	top: `${number}%`;
	color: string;
}) {
	return (
		<View
			pointerEvents="none"
			className="absolute rounded-full border-2 border-white"
			style={{
				left,
				top,
				width: HANDLE,
				height: HANDLE,
				marginLeft: -HANDLE / 2,
				marginTop: -HANDLE / 2,
				backgroundColor: color,
				shadowColor: "#000",
				shadowOpacity: 0.3,
				shadowRadius: 3,
				shadowOffset: { width: 0, height: 1 },
				elevation: 3,
			}}
		/>
	);
}

export type ColorPickerProps = {
	value: string;
	onChange: (hex: string) => void;
};

/**
 * Saturation/value square with hue and alpha sliders, a live hex field and
 * hex/rgb/hsl readouts. Emits a hex string on every change so the caller can
 * preview live.
 */
export function ColorPicker({ value, onChange }: ColorPickerProps) {
	const [foreground, mutedForeground, border] = useThemeColor([
		"foreground",
		"field-foreground",
		"border",
	]);

	const parsed = parseColor(value) ?? { r: 15, g: 148, b: 192, a: 1 };
	const hsv = rgbToHsv(parsed);

	// Hue and saturation are undefined for greys and blacks, so the slider
	// position is kept locally to stop the handle jumping while dragging.
	const [hueOverride, setHueOverride] = useState<number | null>(null);
	const hue = hueOverride ?? hsv.h;

	const [format, setFormat] = useState<Format>("hex");
	const [hexDraft, setHexDraft] = useState<string | null>(null);

	const emit = useCallback(
		(next: Partial<Hsv> & { a?: number }) => {
			const merged = {
				h: next.h ?? hue,
				s: next.s ?? hsv.s,
				v: next.v ?? hsv.v,
			};
			const alpha = next.a ?? parsed.a;
			setHexDraft(null);
			onChange(rgbaToHex({ ...hsvToRgb(merged), a: alpha }));
		},
		[hue, hsv.s, hsv.v, parsed.a, onChange],
	);

	const square = useDragTracker(
		useCallback(
			(point) => {
				setHueOverride(hue);
				emit({ s: point.x, v: 1 - point.y });
			},
			[emit, hue],
		),
	);

	const hueTrack = useDragTracker(
		useCallback(
			(point) => {
				const nextHue = point.x * 360;
				setHueOverride(nextHue);
				emit({ h: nextHue });
			},
			[emit],
		),
	);

	const alphaTrack = useDragTracker(
		useCallback((point) => emit({ a: point.x }), [emit]),
	);

	const opaque: Rgba = { ...parsed, a: 1 };
	const solidHex = rgbaToHex(opaque);
	const readout =
		format === "hex"
			? (hexDraft ?? rgbaToHex(parsed))
			: format === "rgb"
				? formatRgb(parsed)
				: formatHsl(parsed);

	function commitText(text: string) {
		setHexDraft(text);
		const next = parseColor(text);
		if (!next) return;
		setHueOverride(null);
		onChange(rgbaToHex(next));
	}

	return (
		<View className="gap-4">
			{/* Saturation / value */}
			<View
				className="overflow-hidden rounded-2xl"
				style={{ height: SQUARE_HEIGHT }}
				onLayout={square.onLayout}
				{...square.panHandlers}
			>
				<Svg width="100%" height="100%">
					<Defs>
						<LinearGradient id="sat" x1="0" y1="0" x2="1" y2="0">
							<Stop offset="0" stopColor="#ffffff" />
							<Stop offset="1" stopColor={hueColor(hue)} />
						</LinearGradient>
						<LinearGradient id="val" x1="0" y1="0" x2="0" y2="1">
							<Stop offset="0" stopColor="#000000" stopOpacity="0" />
							<Stop offset="1" stopColor="#000000" stopOpacity="1" />
						</LinearGradient>
					</Defs>
					<Rect x="0" y="0" width="100%" height="100%" fill="url(#sat)" />
					<Rect x="0" y="0" width="100%" height="100%" fill="url(#val)" />
				</Svg>
				<Handle
					left={`${hsv.s * 100}%` as const}
					top={`${(1 - hsv.v) * 100}%` as const}
					color={solidHex}
				/>
			</View>

			{/* Hue */}
			<View
				className="justify-center"
				style={{ height: HANDLE }}
				onLayout={hueTrack.onLayout}
				{...hueTrack.panHandlers}
			>
				<View
					className="overflow-hidden rounded-full"
					style={{ height: SLIDER_HEIGHT }}
					pointerEvents="none"
				>
					<Svg width="100%" height="100%">
						<Defs>
							<LinearGradient id="hue" x1="0" y1="0" x2="1" y2="0">
								{[
									"#ff0000",
									"#ffff00",
									"#00ff00",
									"#00ffff",
									"#0000ff",
									"#ff00ff",
									"#ff0000",
								].map((stop, index) => (
									<Stop
										key={stop + String(index)}
										offset={String(index / 6)}
										stopColor={stop}
									/>
								))}
							</LinearGradient>
						</Defs>
						<Rect x="0" y="0" width="100%" height="100%" fill="url(#hue)" />
					</Svg>
				</View>
				<Handle
					left={`${(hue / 360) * 100}%` as const}
					top="50%"
					color={hueColor(hue)}
				/>
			</View>

			{/* Alpha */}
			<View
				className="justify-center"
				style={{ height: HANDLE }}
				onLayout={alphaTrack.onLayout}
				{...alphaTrack.panHandlers}
			>
				<View
					className="overflow-hidden rounded-full"
					style={{ height: SLIDER_HEIGHT }}
					pointerEvents="none"
				>
					<Svg width="100%" height="100%">
						<Defs>
							<Pattern
								id="checks"
								width="12"
								height="12"
								patternUnits="userSpaceOnUse"
							>
								<Rect x="0" y="0" width="12" height="12" fill="#ffffff" />
								<Rect x="0" y="0" width="6" height="6" fill="#d8dcdc" />
								<Rect x="6" y="6" width="6" height="6" fill="#d8dcdc" />
							</Pattern>
							<LinearGradient id="alpha" x1="0" y1="0" x2="1" y2="0">
								<Stop offset="0" stopColor={solidHex} stopOpacity="0" />
								<Stop offset="1" stopColor={solidHex} stopOpacity="1" />
							</LinearGradient>
						</Defs>
						<Rect x="0" y="0" width="100%" height="100%" fill="url(#checks)" />
						<Rect x="0" y="0" width="100%" height="100%" fill="url(#alpha)" />
					</Svg>
				</View>
				<Handle
					left={`${parsed.a * 100}%` as const}
					top="50%"
					color={solidHex}
				/>
			</View>

			{/* Preview + editable value */}
			<View className="flex-row items-center gap-3">
				<View
					className="size-12 rounded-full border"
					style={{ backgroundColor: rgbaToHex(parsed), borderColor: border }}
				/>
				<TextInput
					value={readout}
					onChangeText={commitText}
					editable={format === "hex"}
					autoCapitalize="none"
					autoCorrect={false}
					accessibilityLabel="Colour value"
					className="h-12 flex-1 rounded-full bg-background px-4 text-center text-base"
					style={{ color: foreground, borderColor: border, borderWidth: 1 }}
				/>
			</View>

			{/* Format switch */}
			<View className="flex-row rounded-full bg-secondary p-1">
				{FORMATS.map((option) => {
					const active = option === format;
					return (
						<Pressable
							key={option}
							onPress={() => {
								setHexDraft(null);
								setFormat(option);
							}}
							accessibilityRole="button"
							accessibilityState={{ selected: active }}
							className={`flex-1 items-center rounded-full py-2 active:opacity-70 ${
								active ? "bg-background" : ""
							}`}
						>
							<Text
								className="font-medium text-sm"
								style={{ color: active ? foreground : mutedForeground }}
							>
								{option.toUpperCase()}
							</Text>
						</Pressable>
					);
				})}
			</View>
		</View>
	);
}
