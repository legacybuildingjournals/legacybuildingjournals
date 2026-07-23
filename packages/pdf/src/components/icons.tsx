import { Line, Path, Rect, Svg } from "@react-pdf/renderer";

import type { MemoryKind } from "../types";

type IconProps = {
	size: number;
	color: string;
};

/** Lucide `calendar`, drawn as SVG so it prints crisply at any size. */
export function CalendarIcon({ size, color }: IconProps) {
	return (
		<Svg
			viewBox="0 0 24 24"
			width={size}
			height={size}
			style={{ width: size, height: size }}
		>
			<Rect
				x="3"
				y="4"
				width="18"
				height="18"
				rx="2"
				ry="2"
				stroke={color}
				strokeWidth={2}
				fill="none"
			/>
			<Line x1="16" y1="2" x2="16" y2="6" stroke={color} strokeWidth={2} />
			<Line x1="8" y1="2" x2="8" y2="6" stroke={color} strokeWidth={2} />
			<Line x1="3" y1="10" x2="21" y2="10" stroke={color} strokeWidth={2} />
		</Svg>
	);
}

/** Lucide `mic`. */
function MicIcon({ size, color }: IconProps) {
	return (
		<Svg
			viewBox="0 0 24 24"
			width={size}
			height={size}
			style={{ width: size, height: size }}
		>
			<Path
				d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"
				stroke={color}
				strokeWidth={2}
				fill="none"
			/>
			<Path
				d="M19 10v2a7 7 0 0 1-14 0v-2"
				stroke={color}
				strokeWidth={2}
				fill="none"
			/>
			<Line x1="12" y1="19" x2="12" y2="22" stroke={color} strokeWidth={2} />
		</Svg>
	);
}

/** Lucide `film`. */
function FilmIcon({ size, color }: IconProps) {
	return (
		<Svg
			viewBox="0 0 24 24"
			width={size}
			height={size}
			style={{ width: size, height: size }}
		>
			<Rect
				x="2"
				y="2"
				width="20"
				height="20"
				rx="2.18"
				ry="2.18"
				stroke={color}
				strokeWidth={2}
				fill="none"
			/>
			<Line x1="7" y1="2" x2="7" y2="22" stroke={color} strokeWidth={2} />
			<Line x1="17" y1="2" x2="17" y2="22" stroke={color} strokeWidth={2} />
			<Line x1="2" y1="12" x2="22" y2="12" stroke={color} strokeWidth={2} />
			<Line x1="2" y1="7" x2="7" y2="7" stroke={color} strokeWidth={2} />
			<Line x1="2" y1="17" x2="7" y2="17" stroke={color} strokeWidth={2} />
			<Line x1="17" y1="17" x2="22" y2="17" stroke={color} strokeWidth={2} />
			<Line x1="17" y1="7" x2="22" y2="7" stroke={color} strokeWidth={2} />
		</Svg>
	);
}

export function MemoryIcon({
	kind,
	size,
	color,
}: IconProps & { kind: MemoryKind }) {
	return kind === "video" ? (
		<FilmIcon size={size} color={color} />
	) : (
		<MicIcon size={size} color={color} />
	);
}
