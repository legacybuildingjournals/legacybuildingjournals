import {
	JournalDocument,
	type JournalPdfEntry,
	type JournalStoryType,
} from "@legacy-building/pdf";
import { PDFViewer, pdf } from "@react-pdf/renderer";
import QRCode from "qrcode";
import { useCallback, useId, useMemo, useState } from "react";

import { Button } from "@/components/journal/ui/button";
import { Input } from "@/components/journal/ui/input";

/**
 * Design harness for the exported journal template. Books are rendered
 * server-side in production; this page exists so the layout can be iterated on
 * in the browser against the same components.
 */

type DraftEntry = JournalPdfEntry & { memoryUrl: string };

/** Entries carry an id purely so the on-screen list has a stable React key. */
type ListedEntry = JournalPdfEntry & { id: string };

const emptyEntry = (): DraftEntry => ({
	title: "",
	date: "",
	body: "",
	imageUrl: undefined,
	memories: [],
	memoryUrl: "",
});

export function MyStoryPdfApp() {
	const journalNameId = useId();
	const storyTypeId = useId();
	const dedicationId = useId();
	const titleId = useId();
	const dateId = useId();
	const bodyId = useId();
	const imageId = useId();
	const memoryId = useId();

	const [journalName, setJournalName] = useState("My First Car Journal");
	const [storyType, setStoryType] = useState<JournalStoryType>("my_story");
	const [dedication, setDedication] = useState("");
	const [includeFrontMatter, setIncludeFrontMatter] = useState(false);
	const [entries, setEntries] = useState<ListedEntry[]>([]);
	const [currentEntry, setCurrentEntry] = useState<DraftEntry>(emptyEntry);
	const [showPreview, setShowPreview] = useState(false);
	const [downloading, setDownloading] = useState(false);

	const documentProps = useMemo(
		() => ({
			journalName,
			storyType,
			dedication,
			entries,
			includeFrontMatter,
		}),
		[journalName, storyType, dedication, entries, includeFrontMatter],
	);

	const handleImageChange = useCallback(
		(event: React.ChangeEvent<HTMLInputElement>) => {
			const file = event.target.files?.[0];
			if (!file) {
				setCurrentEntry((prev) => ({ ...prev, imageUrl: undefined }));
				return;
			}
			const reader = new FileReader();
			reader.onload = () => {
				setCurrentEntry((prev) => ({
					...prev,
					imageUrl:
						typeof reader.result === "string" ? reader.result : undefined,
				}));
			};
			reader.readAsDataURL(file);
		},
		[],
	);

	const addEntry = useCallback(async () => {
		if (!currentEntry.title.trim() && !currentEntry.body.trim()) return;

		const memoryUrl = currentEntry.memoryUrl.trim();
		const memories = memoryUrl
			? [
					{
						kind: "voice" as const,
						qrDataUrl: await QRCode.toDataURL(memoryUrl, {
							margin: 1,
							width: 600,
						}),
					},
				]
			: [];

		setEntries((prev) => [
			...prev,
			{
				id: crypto.randomUUID(),
				title: currentEntry.title.trim(),
				date: currentEntry.date.trim(),
				body: currentEntry.body.trim(),
				imageUrl: currentEntry.imageUrl,
				memories,
			},
		]);
		setCurrentEntry(emptyEntry());
	}, [currentEntry]);

	const downloadPdf = useCallback(async () => {
		setDownloading(true);
		try {
			const blob = await pdf(<JournalDocument {...documentProps} />).toBlob();
			const url = URL.createObjectURL(blob);
			const anchor = document.createElement("a");
			anchor.href = url;
			anchor.download = "journal.pdf";
			anchor.click();
			URL.revokeObjectURL(url);
		} finally {
			setDownloading(false);
		}
	}, [documentProps]);

	return (
		<div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10">
			<header className="space-y-1">
				<h1 className="font-semibold text-2xl text-foreground">
					Journal PDF template
				</h1>
				<p className="text-muted-foreground text-sm">
					Preview the exported book layout. Production exports render this same
					template on the server.
				</p>
			</header>

			<section className="grid gap-4 rounded-xl border border-border bg-white p-5">
				<div className="grid gap-1.5">
					<label htmlFor={journalNameId} className="font-medium text-sm">
						Journal name
					</label>
					<Input
						id={journalNameId}
						value={journalName}
						onChange={(e) => setJournalName(e.target.value)}
						placeholder="A journal for Mom"
					/>
				</div>
				<div className="grid gap-1.5">
					<label htmlFor={storyTypeId} className="font-medium text-sm">
						Story type
					</label>
					<select
						id={storyTypeId}
						value={storyType}
						onChange={(e) => setStoryType(e.target.value as JournalStoryType)}
						className="h-9 rounded-md border border-border px-3 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-primary"
					>
						<option value="my_story">My Story</option>
						<option value="their_story">Their Story</option>
					</select>
				</div>
				<div className="grid gap-1.5">
					<label htmlFor={dedicationId} className="font-medium text-sm">
						Dedication
					</label>
					<Input
						id={dedicationId}
						value={dedication}
						onChange={(e) => setDedication(e.target.value)}
						placeholder="For the people who made this possible."
					/>
				</div>
				<label className="flex w-fit items-center gap-2 text-sm transition-colors hover:text-primary">
					<input
						type="checkbox"
						checked={includeFrontMatter}
						onChange={(e) => setIncludeFrontMatter(e.target.checked)}
					/>
					Include cover and dedication pages
				</label>
			</section>

			<section className="grid gap-4 rounded-xl border border-border bg-white p-5">
				<h2 className="font-medium text-base">Add entry</h2>
				<div className="grid gap-1.5">
					<label htmlFor={titleId} className="font-medium text-sm">
						Title
					</label>
					<Input
						id={titleId}
						value={currentEntry.title}
						onChange={(e) =>
							setCurrentEntry((prev) => ({ ...prev, title: e.target.value }))
						}
						placeholder="HKS Intercooler Installation"
					/>
				</div>
				<div className="grid gap-1.5">
					<label htmlFor={dateId} className="font-medium text-sm">
						Date
					</label>
					<Input
						id={dateId}
						value={currentEntry.date}
						onChange={(e) =>
							setCurrentEntry((prev) => ({ ...prev, date: e.target.value }))
						}
						placeholder="June 10, 2026"
					/>
				</div>
				<div className="grid gap-1.5">
					<label htmlFor={bodyId} className="font-medium text-sm">
						Body
					</label>
					<textarea
						id={bodyId}
						value={currentEntry.body}
						onChange={(e) =>
							setCurrentEntry((prev) => ({ ...prev, body: e.target.value }))
						}
						rows={5}
						className="min-h-[120px] w-full rounded-md border border-border px-3 py-2 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary"
					/>
				</div>
				<div className="grid gap-1.5">
					<label htmlFor={imageId} className="font-medium text-sm">
						Image
					</label>
					<input
						id={imageId}
						type="file"
						accept="image/*"
						onChange={handleImageChange}
						className="text-sm"
					/>
				</div>
				<div className="grid gap-1.5">
					<label htmlFor={memoryId} className="font-medium text-sm">
						Voice memory URL
					</label>
					<Input
						id={memoryId}
						value={currentEntry.memoryUrl}
						onChange={(e) =>
							setCurrentEntry((prev) => ({
								...prev,
								memoryUrl: e.target.value,
							}))
						}
						placeholder="https://…/recording.m4a — adds a QR page"
					/>
				</div>
				<Button
					type="button"
					onClick={() => void addEntry()}
					className="w-fit transition-colors active:scale-[0.98]"
				>
					Add entry
				</Button>
			</section>

			{entries.length > 0 ? (
				<section className="rounded-xl border border-border bg-white p-5">
					<h2 className="mb-3 font-medium text-base">
						Entries ({entries.length})
					</h2>
					<ul className="space-y-1 text-sm">
						{entries.map((entry) => (
							<li key={entry.id}>
								{entry.title || "Untitled"}
								{entry.date ? ` — ${entry.date}` : ""}
								{entry.memories.length > 0 ? " · voice memory" : ""}
							</li>
						))}
					</ul>
				</section>
			) : null}

			<div className="flex flex-wrap gap-3">
				<Button
					type="button"
					onClick={() => setShowPreview(true)}
					className="transition-colors active:scale-[0.98]"
				>
					Preview PDF
				</Button>
				<Button
					type="button"
					variant="outline"
					onClick={() => void downloadPdf()}
					disabled={downloading}
					className="transition-colors active:scale-[0.98]"
				>
					{downloading ? "Downloading…" : "Download PDF"}
				</Button>
			</div>

			{showPreview ? (
				<section className="overflow-hidden rounded-xl border border-border bg-white">
					<div className="flex items-center justify-between border-border border-b px-4 py-2">
						<span className="font-medium text-sm">Preview</span>
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={() => setShowPreview(false)}
						>
							Close
						</Button>
					</div>
					<PDFViewer width="100%" height="700px" showToolbar>
						<JournalDocument {...documentProps} />
					</PDFViewer>
				</section>
			) : null}
		</div>
	);
}
