"use node";

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { nunitoBold } from "@legacy-building/pdf/fonts/nunito-bold";
import { nunitoRegular } from "@legacy-building/pdf/fonts/nunito-regular";
import { Resvg } from "@resvg/resvg-js";
import QRCode from "qrcode";

import {
	GIFT_CARD_TEMPLATE_HEIGHT,
	GIFT_CARD_TEMPLATE_WIDTH,
	giftCardTemplateDataUrl,
} from "./cardTemplate";

/**
 * SST-5 gift card: the client's template (4x6 in at 300 dpi = 1200x1800 px)
 * with the recipient, purchaser, title, message and the claim QR code drawn
 * on top. The claim link, recipient email and claim-by date live in the
 * purchaser email, not on the card (client design).
 *
 * Layout coordinates are in template pixels. The two coloured bands in the
 * template are the "To" and "From" fields; the QR tile sits centred under the
 * "Your story starts here" arrow.
 */

export type GiftCardInput = {
	recipientName: string;
	purchaserName: string;
	title: string;
	message: string;
	/** Encoded in the QR code. */
	redeemUrl: string;
};

const W = GIFT_CARD_TEMPLATE_WIDTH;
const H = GIFT_CARD_TEMPLATE_HEIGHT;
const INK = "#173f40";
const TEAL = "#0f6b6b";
const MUTED = "#4b5b5c";
const LABEL = "#8a6a3b";
const FONT = "Nunito";

/** Text column shared by the To/From bands and the message (template px). */
const COLUMN = { left: 130, right: 830 } as const;
const COLUMN_CENTER = (COLUMN.left + COLUMN.right) / 2;
const COLUMN_WIDTH = COLUMN.right - COLUMN.left;

/** Message font size and line cap (fits GIFT_LIMITS.messageMax characters). */
const MESSAGE_SIZE = 27;
const MESSAGE_MAX_LINES = 4;

/** White tile holding the QR code, centred on the card under the arrow. */
const QR_SIZE = 236;
const QR_PADDING = 18;
const QR_TILE = {
	size: QR_SIZE + QR_PADDING * 2,
	x: (W - (QR_SIZE + QR_PADDING * 2)) / 2,
	y: 1478,
} as const;

function escapeXml(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}

/** Rough Nunito advance widths (em) — good enough to wrap and shrink-to-fit. */
function textWidth(text: string, size: number, bold = false): number {
	let em = 0;
	for (const ch of text) {
		if (ch === " ") em += 0.26;
		else if (/[A-Z]/.test(ch)) em += 0.66;
		else if (/[0-9]/.test(ch)) em += 0.56;
		else if (/[mw@]/.test(ch)) em += 0.82;
		else if (/[il.,'|!:;]/.test(ch)) em += 0.26;
		else em += 0.52;
	}
	return em * size * (bold ? 1.05 : 1);
}

/** Largest size ≤ max (≥ min) at which `text` fits `width`; truncates at min. */
function fitText(
	text: string,
	width: number,
	max: number,
	min: number,
	bold = false,
): { text: string; size: number } {
	for (let size = max; size >= min; size -= 2) {
		if (textWidth(text, size, bold) <= width) return { text, size };
	}
	let cut = text;
	while (cut.length > 1 && textWidth(`${cut}…`, min, bold) > width) {
		cut = cut.slice(0, -1);
	}
	return { text: cut === text ? text : `${cut.trimEnd()}…`, size: min };
}

/** Greedy word wrap into at most `maxLines`, ellipsising the last line. */
function wrap(
	text: string,
	width: number,
	size: number,
	maxLines: number,
): string[] {
	const words = text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
	const lines: string[] = [];
	let line = "";
	for (const word of words) {
		const next = line ? `${line} ${word}` : word;
		if (textWidth(next, size) <= width) {
			line = next;
			continue;
		}
		if (line) lines.push(line);
		line = word;
		if (lines.length === maxLines) break;
	}
	if (lines.length < maxLines && line) lines.push(line);
	const overflow =
		lines.join(" ").length < words.join(" ").length && lines.length > 0;
	if (overflow) {
		let last = lines[lines.length - 1] ?? "";
		while (last.length > 1 && textWidth(`${last}…`, size) > width) {
			last = last.slice(0, -1);
		}
		lines[lines.length - 1] = `${last.trimEnd()}…`;
	}
	return lines.slice(0, maxLines);
}

function text(
	x: number,
	y: number,
	content: string,
	size: number,
	options: {
		weight?: 400 | 700;
		color?: string;
		anchor?: "start" | "middle" | "end";
	} = {},
): string {
	return `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}" font-weight="${options.weight ?? 400}" fill="${options.color ?? INK}" text-anchor="${options.anchor ?? "start"}">${escapeXml(content)}</text>`;
}

async function qrSvg(url: string, x: number, y: number, size: number) {
	const raw = await QRCode.toString(url, {
		type: "svg",
		margin: 0,
		errorCorrectionLevel: "M",
		color: { dark: TEAL, light: "#ffffff" },
	});
	const body = raw
		.replace(/<\?xml[^>]*>/, "")
		.replace(/\s(width|height)="[^"]*"/g, "");
	return body.replace(
		"<svg ",
		`<svg x="${x}" y="${y}" width="${size}" height="${size}" `,
	);
}

let fontFiles: string[] | null = null;

/** resvg-js loads fonts from disk; write the embedded Nunito to /tmp once. */
function ensureFontFiles(): string[] {
	if (fontFiles?.every((file) => existsSync(file))) return fontFiles;
	const dir = join(tmpdir(), "legacy-gift-card-fonts");
	mkdirSync(dir, { recursive: true });
	const sources = [
		["Nunito-Regular.ttf", nunitoRegular],
		["Nunito-Bold.ttf", nunitoBold],
	] as const;
	fontFiles = sources.map(([name, dataUrl]) => {
		const file = join(dir, name);
		if (!existsSync(file)) {
			const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
			writeFileSync(file, Buffer.from(base64, "base64"));
		}
		return file;
	});
	return fontFiles;
}

export function buildGiftCardSvg(input: GiftCardInput, qr: string): string {
	const parts: string[] = [];
	parts.push(
		`<image href="${giftCardTemplateDataUrl}" x="0" y="0" width="${W}" height="${H}" preserveAspectRatio="none"/>`,
	);

	// "To" band (peach) and "From" band (mint): small label, then the name
	// left-aligned on the line under it (matches the client's design).
	const nameX = COLUMN.left + 46;
	const nameWidth = COLUMN.right - 46 - nameX;
	const to = fitText(input.recipientName, nameWidth, 46, 28, true);
	parts.push(
		text(nameX, 718, "Especially for:", 24, { weight: 700, color: LABEL }),
	);
	parts.push(text(nameX, 768, to.text, to.size, { weight: 700 }));
	const from = fitText(input.purchaserName, nameWidth, 46, 28, true);
	parts.push(
		text(nameX, 878, "With love from:", 24, { weight: 700, color: LABEL }),
	);
	parts.push(text(nameX, 928, from.text, from.size, { weight: 700 }));

	// Gift title + personal message between the bands and the heart divider.
	// The message is capped at GIFT_LIMITS.messageMax characters so it always
	// fits MESSAGE_MAX_LINES; wrap() still ellipsises older, longer messages.
	const title = fitText(input.title, COLUMN_WIDTH, 34, 24, true);
	parts.push(
		text(COLUMN_CENTER, 1020, title.text, title.size, {
			weight: 700,
			color: TEAL,
			anchor: "middle",
		}),
	);
	const messageLines = input.message.trim()
		? wrap(
				`“${input.message.trim()}”`,
				COLUMN_WIDTH,
				MESSAGE_SIZE,
				MESSAGE_MAX_LINES,
			)
		: ["A lifetime membership to Legacy Building Journals."];
	messageLines.forEach((line, index) => {
		parts.push(
			text(COLUMN_CENTER, 1060 + index * 34, line, MESSAGE_SIZE, {
				color: MUTED,
				anchor: "middle",
			}),
		);
	});

	// QR only, in a white rounded tile centred under "Your story starts here".
	parts.push(
		`<rect x="${QR_TILE.x}" y="${QR_TILE.y}" width="${QR_TILE.size}" height="${QR_TILE.size}" rx="28" fill="#ffffff" stroke="${TEAL}" stroke-opacity="0.35" stroke-width="3"/>`,
	);
	parts.push(qr);

	return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${parts.join("")}</svg>`;
}

/** Render the personalised gift card as a print-ready PNG (1200x1800, 300 dpi). */
export async function renderGiftCardPng(input: GiftCardInput): Promise<Buffer> {
	const qr = await qrSvg(
		input.redeemUrl,
		QR_TILE.x + QR_PADDING,
		QR_TILE.y + QR_PADDING,
		QR_SIZE,
	);
	const svg = buildGiftCardSvg(input, qr);
	const resvg = new Resvg(svg, {
		fitTo: { mode: "original" },
		dpi: 300,
		font: {
			loadSystemFonts: false,
			fontFiles: ensureFontFiles(),
			defaultFontFamily: FONT,
		},
	});
	return resvg.render().asPng();
}
