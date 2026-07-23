/**
 * Colour maths shared by the web and native colour pickers.
 *
 * Pure functions, no dependencies — safe to pull into a React Native bundle.
 * HSV drives the picker UI (saturation/value square + hue slider); hex is what
 * gets persisted.
 */

export type Rgb = { r: number; g: number; b: number };
export type Rgba = Rgb & { a: number };
/** h: 0–360, s/v: 0–1 */
export type Hsv = { h: number; s: number; v: number };
/** h: 0–360, s/l: 0–100 */
export type Hsl = { h: number; s: number; l: number };

export const DEFAULT_PICKER_COLOR = "#0f94c0";

function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}

export function clamp01(value: number): number {
	return clamp(value, 0, 1);
}

export function hsvToRgb({ h, s, v }: Hsv): Rgb {
	const hue = ((h % 360) + 360) % 360;
	const c = v * s;
	const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
	const m = v - c;

	let rgb: [number, number, number];
	if (hue < 60) rgb = [c, x, 0];
	else if (hue < 120) rgb = [x, c, 0];
	else if (hue < 180) rgb = [0, c, x];
	else if (hue < 240) rgb = [0, x, c];
	else if (hue < 300) rgb = [x, 0, c];
	else rgb = [c, 0, x];

	return {
		r: Math.round((rgb[0] + m) * 255),
		g: Math.round((rgb[1] + m) * 255),
		b: Math.round((rgb[2] + m) * 255),
	};
}

export function rgbToHsv({ r, g, b }: Rgb): Hsv {
	const rn = r / 255;
	const gn = g / 255;
	const bn = b / 255;
	const max = Math.max(rn, gn, bn);
	const min = Math.min(rn, gn, bn);
	const delta = max - min;

	let h = 0;
	if (delta !== 0) {
		if (max === rn) h = 60 * (((gn - bn) / delta) % 6);
		else if (max === gn) h = 60 * ((bn - rn) / delta + 2);
		else h = 60 * ((rn - gn) / delta + 4);
	}
	if (h < 0) h += 360;

	return { h, s: max === 0 ? 0 : delta / max, v: max };
}

export function rgbToHsl({ r, g, b }: Rgb): Hsl {
	const { h, s: sv, v } = rgbToHsv({ r, g, b });
	const l = v * (1 - sv / 2);
	const s = l === 0 || l === 1 ? 0 : (v - l) / Math.min(l, 1 - l);
	return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
}

export function hslToRgb({ h, s, l }: Hsl): Rgb {
	const sn = clamp01(s / 100);
	const ln = clamp01(l / 100);
	const v = ln + sn * Math.min(ln, 1 - ln);
	const sv = v === 0 ? 0 : 2 * (1 - ln / v);
	return hsvToRgb({ h, s: sv, v });
}

function toHexPair(value: number): string {
	return clamp(Math.round(value), 0, 255).toString(16).padStart(2, "0");
}

/** Emits `#rrggbb`, or `#rrggbbaa` when the colour is not fully opaque. */
export function rgbaToHex({ r, g, b, a }: Rgba): string {
	const base = `#${toHexPair(r)}${toHexPair(g)}${toHexPair(b)}`;
	if (a >= 1) return base;
	return `${base}${toHexPair(clamp01(a) * 255)}`;
}

/**
 * Parses `#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`, `rgb()`/`rgba()` and
 * `hsl()`/`hsla()`. Returns null for anything it can't read, so callers can
 * leave a half-typed hex field alone.
 */
export function parseColor(input: string): Rgba | null {
	const value = input.trim().toLowerCase();
	if (!value) return null;

	if (value.startsWith("#")) {
		const hex = value.slice(1);
		const expand = (chars: string) =>
			chars
				.split("")
				.map((c) => c + c)
				.join("");

		let normalized: string | null = null;
		if (hex.length === 3 || hex.length === 4) normalized = expand(hex);
		else if (hex.length === 6 || hex.length === 8) normalized = hex;
		if (!normalized || !/^[0-9a-f]+$/.test(normalized)) return null;

		return {
			r: Number.parseInt(normalized.slice(0, 2), 16),
			g: Number.parseInt(normalized.slice(2, 4), 16),
			b: Number.parseInt(normalized.slice(4, 6), 16),
			a:
				normalized.length === 8
					? Number.parseInt(normalized.slice(6, 8), 16) / 255
					: 1,
		};
	}

	const numbers = value.match(/-?\d*\.?\d+/g);
	if (!numbers) return null;

	if (value.startsWith("rgb")) {
		const [r, g, b, a] = numbers.map(Number);
		if (r === undefined || g === undefined || b === undefined) return null;
		return {
			r: clamp(r, 0, 255),
			g: clamp(g, 0, 255),
			b: clamp(b, 0, 255),
			a: a === undefined ? 1 : clamp01(a),
		};
	}

	if (value.startsWith("hsl")) {
		const [h, s, l, a] = numbers.map(Number);
		if (h === undefined || s === undefined || l === undefined) return null;
		return {
			...hslToRgb({ h, s, l }),
			a: a === undefined ? 1 : clamp01(a),
		};
	}

	return null;
}

export function formatRgb({ r, g, b, a }: Rgba): string {
	return a >= 1
		? `rgb(${r}, ${g}, ${b})`
		: `rgba(${r}, ${g}, ${b}, ${Number(a.toFixed(2))})`;
}

export function formatHsl(rgba: Rgba): string {
	const { h, s, l } = rgbToHsl(rgba);
	return rgba.a >= 1
		? `hsl(${h}, ${s}%, ${l}%)`
		: `hsla(${h}, ${s}%, ${l}%, ${Number(rgba.a.toFixed(2))})`;
}

/** WCAG relative luminance. */
export function relativeLuminance({ r, g, b }: Rgb): number {
	const channel = (value: number) => {
		const v = value / 255;
		return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
	};
	return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(a: Rgb, b: Rgb): number {
	const la = relativeLuminance(a);
	const lb = relativeLuminance(b);
	const [hi, lo] = la > lb ? [la, lb] : [lb, la];
	return (hi + 0.05) / (lo + 0.05);
}

/**
 * Whether content on top of this colour should be light.
 *
 * Users can pick any colour now, so text can't assume a dark-on-light world.
 * Low-alpha colours sit on the app's own light surface, so they stay "light".
 */
export function needsLightForeground(color: string): boolean {
	const rgba = parseColor(color);
	if (!rgba) return false;
	if (rgba.a < 0.5) return false;
	return relativeLuminance(rgba) < 0.4;
}

/** Pure hue at full saturation and value — the right edge of the SV square. */
export function hueColor(h: number): string {
	return rgbaToHex({ ...hsvToRgb({ h, s: 1, v: 1 }), a: 1 });
}
