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
 * with the recipient, purchaser, title, message, lifetime copy, redemption
 * instructions, QR code and claim link drawn on top.
 *
 * Layout coordinates are in template pixels. The two coloured bands in the
 * template are the "To" and "From" fields; the QR panel sits on the table
 * under the "Your story starts here" arrow.
 */

export type GiftCardInput = {
	recipientName: string;
	recipientEmail: string;
	purchaserName: string;
	title: string;
	message: string;
	redeemUrl: string;
	/** Unix ms; printed as "Claim by …". */
	expiresAt?: number;
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

const PANEL = { x: 498, y: 1498, width: 672, height: 292 } as const;

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

function formatDate(ms: number): string {
	return new Date(ms).toLocaleDateString("en-US", {
		year: "numeric",
		month: "long",
		day: "numeric",
	});
}

/** Display form of the claim link (no scheme) so it can be typed from a print. */
function displayUrl(url: string): string {
	return url.replace(/^https?:\/\//, "");
}

export function buildGiftCardSvg(input: GiftCardInput, qr: string): string {
	const parts: string[] = [];
	parts.push(
		`<image href="${giftCardTemplateDataUrl}" x="0" y="0" width="${W}" height="${H}" preserveAspectRatio="none"/>`,
	);

	// "To" band (peach) and "From" band (mint): small label + name on the line.
	const to = fitText(input.recipientName, COLUMN_WIDTH - 40, 46, 28, true);
	parts.push(
		text(COLUMN.left + 46, 718, "TO", 22, { weight: 700, color: LABEL }),
	);
	parts.push(
		text(COLUMN_CENTER, 768, to.text, to.size, {
			weight: 700,
			anchor: "middle",
		}),
	);
	const from = fitText(input.purchaserName, COLUMN_WIDTH - 40, 46, 28, true);
	parts.push(
		text(COLUMN.left + 46, 878, "FROM", 22, { weight: 700, color: LABEL }),
	);
	parts.push(
		text(COLUMN_CENTER, 928, from.text, from.size, {
			weight: 700,
			anchor: "middle",
		}),
	);

	// Gift title + personal message between the bands and the heart divider.
	const title = fitText(input.title, COLUMN_WIDTH, 34, 24, true);
	parts.push(
		text(COLUMN_CENTER, 1024, title.text, title.size, {
			weight: 700,
			color: TEAL,
			anchor: "middle",
		}),
	);
	const messageLines = input.message.trim()
		? wrap(`“${input.message.trim()}”`, COLUMN_WIDTH, 24, 4)
		: ["A lifetime membership to Legacy Building Journals."];
	messageLines.forEach((line, index) => {
		parts.push(
			text(COLUMN_CENTER, 1064 + index * 32, line, 24, {
				color: MUTED,
				anchor: "middle",
			}),
		);
	});

	// QR panel on the table, under the "Your story starts here" arrow.
	parts.push(
		`<rect x="${PANEL.x}" y="${PANEL.y}" width="${PANEL.width}" height="${PANEL.height}" rx="26" fill="#ffffff" fill-opacity="0.94" stroke="#e7dccb" stroke-width="2"/>`,
	);
	parts.push(qr);
	const tx = PANEL.x + 262;
	const textRight = PANEL.width - 262 - 22;
	parts.push(
		text(tx, PANEL.y + 56, "Scan to claim your gift", 27, {
			weight: 700,
			color: TEAL,
		}),
	);
	parts.push(text(tx, PANEL.y + 92, "Lifetime access to", 20, { color: INK }));
	parts.push(
		text(tx, PANEL.y + 118, "Legacy Building Journals", 20, {
			weight: 700,
			color: INK,
		}),
	);
	parts.push(
		text(tx, PANEL.y + 154, "Sign in or sign up with", 17, { color: MUTED }),
	);
	const email = fitText(input.recipientEmail, textRight, 17, 13, true);
	parts.push(
		text(tx, PANEL.y + 177, email.text, email.size, {
			weight: 700,
			color: MUTED,
		}),
	);
	if (input.expiresAt) {
		parts.push(
			text(tx, PANEL.y + 210, `Claim by ${formatDate(input.expiresAt)}`, 17, {
				color: MUTED,
			}),
		);
	}
	const link = fitText(displayUrl(input.redeemUrl), PANEL.width - 44, 16, 11);
	parts.push(
		text(
			PANEL.x + PANEL.width / 2,
			PANEL.y + PANEL.height - 20,
			link.text,
			link.size,
			{ color: TEAL, anchor: "middle" },
		),
	);

	return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${parts.join("")}</svg>`;
}

/** Render the personalised gift card as a print-ready PNG (1200x1800, 300 dpi). */
export async function renderGiftCardPng(input: GiftCardInput): Promise<Buffer> {
	const qrSize = 222;
	const qr = await qrSvg(input.redeemUrl, PANEL.x + 22, PANEL.y + 18, qrSize);
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
