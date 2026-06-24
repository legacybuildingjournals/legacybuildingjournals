const fs = require("fs");
const {
	Document,
	Packer,
	Paragraph,
	TextRun,
	Table,
	TableRow,
	TableCell,
	AlignmentType,
	LevelFormat,
	HeadingLevel,
	BorderStyle,
	WidthType,
	ShadingType,
	VerticalAlign,
	PageNumber,
	Header,
	Footer,
	PageBreak,
} = require("docx");

// ---- palette ----
const INK = "1F2937";
const BRAND = "1E3A5F"; // deep slate-blue from the mockups
const MUTED = "6B7280";
const HEADER_FILL = "1E3A5F";
const ROW_ALT = "F3F5F8";
const COMP_FILL = "E7F2EC"; // compulsory = green-ish
const OPT_FILL = "FBF1E4"; // optional = warm
const BORDER_COLOR = "D6DBE2";

const CONTENT_WIDTH = 9360;

const cellBorder = { style: BorderStyle.SINGLE, size: 1, color: BORDER_COLOR };
const borders = {
	top: cellBorder,
	bottom: cellBorder,
	left: cellBorder,
	right: cellBorder,
};
const cellMargins = { top: 80, bottom: 80, left: 120, right: 120 };

function txt(text, opts = {}) {
	return new TextRun({ text, ...opts });
}

function para(children, opts = {}) {
	return new Paragraph({
		children: Array.isArray(children) ? children : [children],
		...opts,
	});
}

function bullet(runs, level = 0) {
	return new Paragraph({
		numbering: { reference: "bullets", level },
		children: Array.isArray(runs) ? runs : [txt(runs)],
		spacing: { after: 60 },
	});
}

// Build a field table: columns Field | Req | What we ask & how (UI guidance)
function fieldTable(rows) {
	const widths = [2400, 1100, 5860];
	const headerCells = [
		"Field",
		"Status",
		"What to ask + how to present it",
	].map(
		(label, i) =>
			new TableCell({
				borders,
				width: { size: widths[i], type: WidthType.DXA },
				shading: { fill: HEADER_FILL, type: ShadingType.CLEAR },
				margins: cellMargins,
				verticalAlign: VerticalAlign.CENTER,
				children: [para(txt(label, { bold: true, color: "FFFFFF", size: 20 }))],
			}),
	);

	const bodyRows = rows.map((r, idx) => {
		const reqFill =
			r.req === "Required"
				? COMP_FILL
				: r.req === "Optional"
					? OPT_FILL
					: ROW_ALT;
		return new TableRow({
			children: [
				new TableCell({
					borders,
					width: { size: widths[0], type: WidthType.DXA },
					shading: {
						fill: idx % 2 ? ROW_ALT : "FFFFFF",
						type: ShadingType.CLEAR,
					},
					margins: cellMargins,
					children: [para(txt(r.field, { bold: true, size: 20, color: INK }))],
				}),
				new TableCell({
					borders,
					width: { size: widths[1], type: WidthType.DXA },
					shading: { fill: reqFill, type: ShadingType.CLEAR },
					margins: cellMargins,
					verticalAlign: VerticalAlign.CENTER,
					children: [
						para(txt(r.req, { size: 18, bold: true, color: INK }), {
							alignment: AlignmentType.CENTER,
						}),
					],
				}),
				new TableCell({
					borders,
					width: { size: widths[2], type: WidthType.DXA },
					shading: {
						fill: idx % 2 ? ROW_ALT : "FFFFFF",
						type: ShadingType.CLEAR,
					},
					margins: cellMargins,
					children: [para(txt(r.how, { size: 19, color: INK }))],
				}),
			],
		});
	});

	return new Table({
		width: { size: CONTENT_WIDTH, type: WidthType.DXA },
		columnWidths: widths,
		rows: [
			new TableRow({ tableHeader: true, children: headerCells }),
			...bodyRows,
		],
	});
}

function pageHeading(num, title, subtitle) {
	const out = [
		new Paragraph({
			heading: HeadingLevel.HEADING_1,
			children: [txt(`${num}. ${title}`)],
			spacing: { before: 320, after: 80 },
		}),
	];
	if (subtitle)
		out.push(
			para(txt(subtitle, { italics: true, color: MUTED, size: 20 }), {
				spacing: { after: 160 },
			}),
		);
	return out;
}

function sectionLabel(text) {
	return para(txt(text, { bold: true, color: BRAND, size: 21 }), {
		spacing: { before: 160, after: 80 },
	});
}

const doc = new Document({
	creator: "Onboarding spec",
	title: "ForeShift — Restaurant Onboarding Data Spec",
	styles: {
		default: { document: { run: { font: "Arial", size: 21, color: INK } } },
		paragraphStyles: [
			{
				id: "Heading1",
				name: "Heading 1",
				basedOn: "Normal",
				next: "Normal",
				quickFormat: true,
				run: { size: 30, bold: true, color: BRAND, font: "Arial" },
				paragraph: { spacing: { before: 280, after: 120 }, outlineLevel: 0 },
			},
			{
				id: "Heading2",
				name: "Heading 2",
				basedOn: "Normal",
				next: "Normal",
				quickFormat: true,
				run: { size: 24, bold: true, color: INK, font: "Arial" },
				paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 1 },
			},
		],
	},
	numbering: {
		config: [
			{
				reference: "bullets",
				levels: [
					{
						level: 0,
						format: LevelFormat.BULLET,
						text: "•",
						alignment: AlignmentType.LEFT,
						style: { paragraph: { indent: { left: 540, hanging: 280 } } },
					},
					{
						level: 1,
						format: LevelFormat.BULLET,
						text: "◦",
						alignment: AlignmentType.LEFT,
						style: { paragraph: { indent: { left: 1080, hanging: 280 } } },
					},
				],
			},
		],
	},
	sections: [
		{
			properties: {
				page: {
					size: { width: 12240, height: 15840 },
					margin: { top: 1080, right: 1440, bottom: 1080, left: 1440 },
				},
			},
			footers: {
				default: new Footer({
					children: [
						new Paragraph({
							alignment: AlignmentType.CENTER,
							children: [
								txt("ForeShift — Onboarding Data Spec   ·   Page ", {
									size: 16,
									color: MUTED,
								}),
								new TextRun({
									children: [PageNumber.CURRENT],
									size: 16,
									color: MUTED,
								}),
							],
						}),
					],
				}),
			},
			children: [
				// ---- Title block ----
				new Paragraph({
					children: [
						txt("Restaurant Onboarding — Data Collection Spec", {
							bold: true,
							size: 40,
							color: BRAND,
						}),
					],
					spacing: { after: 40 },
				}),
				para(
					txt("What to ask on each onboarding step, and how to present it", {
						size: 22,
						color: MUTED,
					}),
					{ spacing: { after: 60 } },
				),
				new Paragraph({
					border: {
						bottom: {
							style: BorderStyle.SINGLE,
							size: 8,
							color: BRAND,
							space: 4,
						},
					},
					children: [txt("")],
					spacing: { after: 160 },
				}),

				// ---- Context / approach ----
				para(
					[
						txt("Approach. ", { bold: true }),
						txt(
							"Recommendations are generated by prompting Claude with each restaurant’s data — we are not training a custom model. Because the data goes into a prompt, we collect ",
							{},
						),
						txt("compact, pre-summarised, high-signal fields", { bold: true }),
						txt(
							" rather than raw transaction dumps. Onboarding stays light: anything we can derive from the address (weather, holidays, local events, sports) we fetch ourselves and never ask the client for.",
							{},
						),
					],
					{ spacing: { after: 120 } },
				),

				// ---- Legend ----
				sectionLabel("How to read the “Status” column"),
				bullet([
					txt("Required", { bold: true }),
					txt(
						" — onboarding cannot complete without it; the recommendation engine depends on it.",
					),
				]),
				bullet([
					txt("Optional", { bold: true }),
					txt(
						" — improves recommendation quality; offer it but allow “Skip for now / add later.”",
					),
				]),
				para(
					txt(
						"Fields marked NEW are additions to the current onboarding; the rest already exist in the current flow.",
						{ italics: true, color: MUTED, size: 19 },
					),
					{ spacing: { before: 60, after: 80 } },
				),

				new Paragraph({ children: [new PageBreak()] }),

				// =====================================================
				// PAGE 1 — Restaurant Profile
				...pageHeading(
					"Onboarding 1",
					"Restaurant Profile",
					"Current page — keep, with two small additions. Identity + location.",
				),
				fieldTable([
					{
						field: "Restaurant name",
						req: "Required",
						how: "Single text field. Label it as the name customers know (used as the title across the dashboard).",
					},
					{
						field: "Full address",
						req: "Required",
						how: "Address autocomplete (Google Places). Critical — we derive weather, holidays, local events and sports from this. Capture lat/long behind the scenes.",
					},
					{
						field: "Cuisine type",
						req: "Required",
						how: "Single-select dropdown (American, Italian, QSR, Cafe, Bar & Grill…) + free-text “Other.” Helps Claude reason about demand patterns and prep.",
					},
					{
						field: "Service model",
						req: "Required",
						how: "NEW. Pill multi-select: Dine-in / Quick-service / Bar / Delivery & takeout-heavy. Changes how staffing and revenue are framed.",
					},
					{
						field: "Price tier",
						req: "Optional",
						how: "NEW. $ – $$$$ selector. Lets Claude sanity-check average check vs. positioning.",
					},
					{
						field: "Short description",
						req: "Optional",
						how: "One-line free text (“Neighbourhood Italian with a big patio”). Useful qualitative context for the prompt.",
					},
				]),

				// =====================================================
				// PAGE 2 — Hours & service periods
				...pageHeading(
					"Onboarding 2",
					"Operating Hours & Service Periods",
					"Current page — keep, add service-period boundaries so forecasts can split lunch vs. dinner.",
				),
				fieldTable([
					{
						field: "Open / close per day",
						req: "Required",
						how: "Existing per-day time pickers (Mon–Sun) with a “Closed” toggle. Pre-fill with sensible defaults to reduce typing.",
					},
					{
						field: "Service periods",
						req: "Required",
						how: "NEW. Let them mark named windows — Breakfast / Lunch / Dinner / Late — with start–end times. Drives the day-part demand and staffing breakdown shown on the dashboard.",
					},
					{
						field: "Last seating time",
						req: "Optional",
						how: "NEW. One time per day. Improves end-of-night staffing recommendations.",
					},
					{
						field: "Seasonal / holiday hour changes",
						req: "Optional",
						how: "NEW. “Add an exception” row (date range + hours). Otherwise we assume standard hours and may over-forecast on a day they’re closed.",
					},
				]),

				new Paragraph({ children: [new PageBreak()] }),

				// =====================================================
				// PAGE 3 — Capacity & layout
				...pageHeading(
					"Onboarding 3",
					"Capacity & Layout",
					"Current “Capacity & Financials” page — split into Capacity (here) and Financials (next) so neither feels heavy.",
				),
				fieldTable([
					{
						field: "Total seats",
						req: "Required",
						how: "Numeric stepper. The ceiling on any demand/revenue forecast.",
					},
					{
						field: "Number of tables",
						req: "Required",
						how: "Numeric stepper. Used with seats for turn-rate reasoning and the “servers per table” staffing rule.",
					},
					{
						field: "Kitchen throughput (covers/hour)",
						req: "Optional",
						how: "NEW. “Roughly how many covers can the kitchen push per hour at peak?” The real constraint on revenue — prevents Claude over-promising on a packed night.",
					},
					{
						field: "Indoor vs. outdoor / patio seats",
						req: "Optional",
						how: "NEW. Two numeric fields. Flags weather sensitivity so Claude weights the forecast accordingly.",
					},
					{
						field: "Bar / private-dining seats",
						req: "Optional",
						how: "NEW. Numeric. Helps separate bar-driven from table-driven revenue.",
					},
				]),

				// =====================================================
				// PAGE 4 — Financial targets
				...pageHeading(
					"Onboarding 4",
					"Financial Targets",
					"NEW dedicated page (split from current Financials). Lets recommendations show $ impact and respect cost ceilings.",
				),
				fieldTable([
					{
						field: "Average check / spend per cover",
						req: "Required",
						how: "NEW (promote to required). Currency field. This is what converts a demand forecast into a revenue number — without it the revenue figures are guesses.",
					},
					{
						field: "Monthly revenue target",
						req: "Required",
						how: "Currency field (already collected). Recommendations are framed as progress toward this.",
					},
					{
						field: "Labour-cost % target",
						req: "Required",
						how: "NEW. Slider / % field (e.g. 28%). Lets staffing recommendations stay within budget and show “$ impact.”",
					},
					{
						field: "Average wage by role",
						req: "Optional",
						how: "NEW. Optional table (Server, Line cook, Host… + hourly rate). Sharpens the cost side of staffing recs; if skipped we use the labour-% target.",
					},
					{
						field: "Food-cost % target / fixed costs",
						req: "Optional",
						how: "NEW. Optional fields. Only needed if recommendations are framed as profit rather than revenue.",
					},
				]),

				new Paragraph({ children: [new PageBreak()] }),

				// =====================================================
				// PAGE 5 — Sales snapshot (the big add)
				...pageHeading(
					"Onboarding 5",
					"Sales & Performance Snapshot",
					"NEW — the most important addition. This is what turns a generic suggestion into a real forecast.",
				),
				para(
					[
						txt("Push hardest for this step. ", { bold: true, color: BRAND }),
						txt(
							"Even without a trained model, giving Claude recent and same-period-last-year sales is the single biggest driver of recommendation quality. Make it as painless as possible — ideally a POS connection, with manual entry as the fallback.",
							{},
						),
					],
					{ spacing: { after: 120 } },
				),
				fieldTable([
					{
						field: "POS system used",
						req: "Required",
						how: "NEW. Single-select (Toast, Square, Lightspeed, Clover, Other). This one answer decides our whole data-import path — ask it first.",
					},
					{
						field: "Avg covers & revenue by day-of-week",
						req: "Required",
						how: "NEW. A 7-row mini-table (Mon–Sun: typical covers, typical revenue). If a POS is connected, pre-fill it and just ask them to confirm.",
					},
					{
						field: "Last 4–8 weeks of daily totals",
						req: "Optional",
						how: "NEW. Auto-imported from POS where possible; otherwise skippable. Gives Claude the recent trend, not just an average.",
					},
					{
						field: "Same period last year",
						req: "Optional",
						how: "NEW. Auto-imported if available. Captures seasonality cheaply for the date being forecast.",
					},
					{
						field: "Day-part split (lunch vs. dinner)",
						req: "Optional",
						how: "NEW. Optional % or covers split. Improves the per-service-period breakdown on the dashboard.",
					},
				]),

				// =====================================================
				// PAGE 6 — Staffing baseline
				...pageHeading(
					"Onboarding 6",
					"Staffing Baseline",
					"NEW — required for the “needed staff” recommendations to be actionable rather than guesses.",
				),
				fieldTable([
					{
						field: "Roles you schedule",
						req: "Required",
						how: "NEW. Multi-select chips: Server, Line cook, Prep, Host, Bartender, Dishwasher, Manager. Defines what Claude is allowed to recommend.",
					},
					{
						field: "Typical staffing — busy vs. slow shift",
						req: "Required",
						how: "NEW. Small grid: for a typical busy shift and a typical slow shift, how many of each role. The baseline Claude adjusts up/down from — without it, “add 2 servers” has no anchor.",
					},
					{
						field: "Scheduling rule of thumb",
						req: "Optional",
						how: "NEW. Free text (“1 server per 4 tables”, “2 cooks below 60 covers”). Excellent qualitative signal for the prompt.",
					},
					{
						field: "Scheduling system used",
						req: "Optional",
						how: "NEW. Single-select (7shifts, HotSchedules, manual…). For future integration; safe to skip now.",
					},
				]),

				new Paragraph({ children: [new PageBreak()] }),

				// =====================================================
				// PAGE 7 — Menu & inventory (optional / progressive)
				...pageHeading(
					"Onboarding 7",
					"Menu & Inventory (optional)",
					"NEW — progressive step. Surface only if menu-mix / inventory recommendations are in scope; allow “Skip.”",
				),
				fieldTable([
					{
						field: "Top-selling items",
						req: "Optional",
						how: "NEW. Let them list (or import) 10–20 top items with price. Improves prep and revenue-mix recommendations.",
					},
					{
						field: "Food vs. beverage vs. alcohol split",
						req: "Optional",
						how: "NEW. Three % fields. Alcohol shifts margins a lot — helps Claude reason about profit, not just covers.",
					},
					{
						field: "Key perishable items + lead times",
						req: "Optional",
						how: "NEW. Only if inventory recs are in scope. Item + supplier lead-time (days) for prep/ordering suggestions.",
					},
					{
						field: "Upcoming promotions / private events",
						req: "Optional",
						how: "NEW. “Add an event” (name, date, expected effect). Critical — an unknown promo will distort every forecast around it.",
					},
				]),

				// =====================================================
				// Auto-derived
				new Paragraph({
					heading: HeadingLevel.HEADING_1,
					children: [txt("Do NOT ask — derive from the address")],
					spacing: { before: 320, after: 100 },
				}),
				para(
					txt(
						"Fetch these automatically so onboarding stays short. They already feed the “Demand Drivers” panel.",
						{ color: MUTED, italics: true },
					),
					{ spacing: { after: 80 } },
				),
				bullet("Weather forecast for the location and date range"),
				bullet("Public / bank holidays"),
				bullet("Nearby events (concerts, festivals, conventions)"),
				bullet("Local sports schedules"),

				// =====================================================
				// Closing — prompt context block
				new Paragraph({
					heading: HeadingLevel.HEADING_1,
					children: [txt("How this maps to the Claude prompt")],
					spacing: { before: 320, after: 100 },
				}),
				para(
					[
						txt("Each onboarding step fills part of a fixed ", {}),
						txt("restaurant context block", { bold: true }),
						txt(
							" that we assemble per recommendation request and inject into the prompt. Summarise in code first — never pass raw POS rows. Suggested order of priority if scope must be trimmed:",
							{},
						),
					],
					{ spacing: { after: 80 } },
				),
				new Paragraph({
					numbering: { reference: "bullets", level: 0 },
					children: [
						txt("Sales snapshot (Page 5) — highest impact", { bold: true }),
					],
					spacing: { after: 60 },
				}),
				bullet("Average check + financial targets (Page 4)"),
				bullet("Staffing baseline (Page 6)"),
				bullet("Capacity, hours & service periods (Pages 2–3)"),
				bullet("Profile (Page 1) + auto-derived external signals"),
				bullet([
					txt(
						"Menu & inventory (Page 7) — add last, only if those recommendation types ship.",
						{},
					),
				]),
			],
		},
	],
});

Packer.toBuffer(doc).then((buf) => {
	fs.writeFileSync(process.argv[2], buf);
	console.log("written", process.argv[2]);
});
