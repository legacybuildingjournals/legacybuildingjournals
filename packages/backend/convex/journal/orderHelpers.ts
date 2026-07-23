import type { Doc, Id } from "../_generated/dataModel";

export const PEECHO_PUBLICATION_URL =
	"https://www.peecho.com/rest/v2/publication/create";
export function requirePeechoConfig(): {
	apiKey: string;
	buttonKey: string;
	checkoutBaseUrl: string;
} {
	const apiKey = process.env.PEECHO_API_KEY;
	const buttonKey = process.env.PEECHO_BUTTON_KEY;
	if (!apiKey || !buttonKey) {
		throw new Error(
			"Book ordering is not configured. Set PEECHO_API_KEY and PEECHO_BUTTON_KEY in Convex environment variables.",
		);
	}

	return {
		apiKey,
		buttonKey,
		checkoutBaseUrl:
			process.env.PEECHO_CHECKOUT_BASE_URL ?? "https://www.peecho.com/print",
	};
}

export function buildPeechoReferenceId(journalId: Id<"journals">): string {
	return `${journalId}-${Date.now()}`;
}

type PeechoPublicationResponse = Record<string, unknown>;

const REQUEST_TIMEOUT_MS = 30_000;

async function fetchWithTimeout(
	url: string,
	init: RequestInit,
): Promise<Response> {
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
	try {
		return await fetch(url, { ...init, signal: controller.signal });
	} catch (error) {
		if (error instanceof Error && error.name === "AbortError") {
			throw new Error(
				`Request timed out after ${REQUEST_TIMEOUT_MS / 1000} seconds.`,
			);
		}
		throw error;
	} finally {
		clearTimeout(timeoutId);
	}
}

async function parsePeechoResponseBody(response: Response): Promise<unknown> {
	const text = (await response.text()).trim();
	if (!text) return null;

	try {
		return JSON.parse(text) as unknown;
	} catch {
		return text;
	}
}

function extractPeechoPublicationId(payload: unknown): string | null {
	if (typeof payload === "number" && Number.isFinite(payload)) {
		return String(Math.trunc(payload));
	}

	if (typeof payload === "string") {
		const trimmed = payload.trim();
		if (!trimmed) return null;
		if (/^\d+$/.test(trimmed)) return trimmed;
		if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
			return trimmed;
		}

		try {
			return extractPeechoPublicationId(JSON.parse(trimmed) as unknown);
		} catch {
			return trimmed;
		}
	}

	if (typeof payload !== "object" || payload === null) {
		return null;
	}

	const record = payload as PeechoPublicationResponse;
	const candidates = [
		record.id,
		record.publicationId,
		record.publication_id,
		typeof record.publication === "object" && record.publication !== null
			? (record.publication as PeechoPublicationResponse).id
			: undefined,
		typeof record.order === "object" && record.order !== null
			? (record.order as PeechoPublicationResponse).id
			: undefined,
		typeof record.order === "object" && record.order !== null
			? (record.order as PeechoPublicationResponse).product
			: undefined,
	];

	for (const candidate of candidates) {
		if (candidate === undefined || candidate === null) continue;
		if (typeof candidate === "object") {
			const nested = extractPeechoPublicationId(candidate);
			if (nested) return nested;
			continue;
		}
		const value = String(candidate).trim();
		if (value.length > 0) return value;
	}

	const checkoutUrl =
		typeof record.checkoutUrl === "string"
			? record.checkoutUrl
			: typeof record.checkout_url === "string"
				? record.checkout_url
				: typeof record.url === "string"
					? record.url
					: null;

	if (checkoutUrl) return checkoutUrl;

	return null;
}

function summarizePeechoPayload(payload: unknown): string {
	if (typeof payload === "string") return payload.slice(0, 200);
	try {
		return JSON.stringify(payload).slice(0, 200);
	} catch {
		return String(payload).slice(0, 200);
	}
}

export async function createPeechoPublication(args: {
	title: string;
	pdfUrl: string;
	pages: number;
	thumbnailUrl: string;
	referenceId: string;
}): Promise<string> {
	const { apiKey, buttonKey, checkoutBaseUrl } = requirePeechoConfig();

	const response = await fetchWithTimeout(PEECHO_PUBLICATION_URL, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Accept: "application/json",
		},
		body: JSON.stringify({
			apiKey,
			buttonKey,
			currency: "USD",
			locale: "en",
			order: {
				reference: args.referenceId,
				product: {
					title: args.title,
					source: {
						file: {
							src: args.pdfUrl,
							pages: args.pages,
							dimensions: {
								height: 297,
								width: 210,
							},
						},
					},
					thumbnail: {
						src: args.thumbnailUrl,
					},
				},
			},
		}),
	});

	const payload = await parsePeechoResponseBody(response);

	if (!response.ok) {
		const record =
			typeof payload === "object" && payload !== null
				? (payload as PeechoPublicationResponse)
				: null;
		throw new Error(
			(typeof record?.message === "string" ? record.message : undefined) ??
				(typeof record?.error === "string" ? record.error : undefined) ??
				(typeof payload === "string" ? payload : undefined) ??
				`Peecho failed with status ${response.status}.`,
		);
	}

	const publicationId = extractPeechoPublicationId(payload);
	if (!publicationId) {
		throw new Error(
			`Peecho did not return a publication id. Response: ${summarizePeechoPayload(payload)}`,
		);
	}

	if (
		publicationId.startsWith("http://") ||
		publicationId.startsWith("https://")
	) {
		return publicationId;
	}

	return `${checkoutBaseUrl.replace(/\/$/, "")}/${publicationId}`;
}

export function resolveThumbnailUrl(args: {
	journal: Pick<Doc<"journals">, "coverImageUrl"> & {
		coverImageUrl?: string;
	};
	entries: Array<{ imageUrl?: string }>;
	pdfUrl: string;
}): string {
	return (
		args.journal.coverImageUrl ??
		args.entries.find((entry) => entry.imageUrl)?.imageUrl ??
		args.pdfUrl
	);
}
