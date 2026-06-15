import { PDFViewer, pdf } from "@react-pdf/renderer";
import { useCallback, useId, useMemo, useState } from "react";
import { Button } from "@/components/journal/ui/button";
import { Input } from "@/components/journal/ui/input";
import { MyStoryDocument } from "@/components/my-story-pdf/MyStoryDocument";
import type { MyStoryEntry } from "@/components/my-story-pdf/types";
import { getImageDimensionsFromDataUrl } from "@/lib/journal/getImageDimensions";

const emptyEntry = (): MyStoryEntry => ({
	heading: "",
	date: "",
	body: "",
	imageBase64: "",
	imageWidth: undefined,
	imageHeight: undefined,
});

function entryListKey(entry: MyStoryEntry) {
	return [entry.heading, entry.date, entry.body, entry.imageBase64 ?? ""].join(
		"|",
	);
}

export function MyStoryPdfApp() {
	const titleId = useId();
	const journalNameId = useId();
	const headingId = useId();
	const dateId = useId();
	const bodyId = useId();
	const imageId = useId();

	const [title, setTitle] = useState("Story");
	const [journalName, setJournalName] = useState("");
	const [entries, setEntries] = useState<MyStoryEntry[]>([]);
	const [currentEntry, setCurrentEntry] = useState<MyStoryEntry>(emptyEntry);
	const [showPreview, setShowPreview] = useState(false);
	const [downloading, setDownloading] = useState(false);

	const documentProps = useMemo(
		() => ({
			title,
			journalName,
			entries,
		}),
		[title, journalName, entries],
	);

	const handleImageChange = useCallback(
		(event: React.ChangeEvent<HTMLInputElement>) => {
			const file = event.target.files?.[0];
			if (!file) {
				setCurrentEntry((prev) => ({
					...prev,
					imageBase64: "",
					imageWidth: undefined,
					imageHeight: undefined,
				}));
				return;
			}
			const reader = new FileReader();
			reader.onload = async () => {
				const dataUrl = typeof reader.result === "string" ? reader.result : "";
				const dimensions = dataUrl
					? await getImageDimensionsFromDataUrl(dataUrl)
					: null;
				setCurrentEntry((prev) => ({
					...prev,
					imageBase64: dataUrl,
					imageWidth: dimensions?.width,
					imageHeight: dimensions?.height,
				}));
			};
			reader.readAsDataURL(file);
		},
		[],
	);

	const addEntry = useCallback(() => {
		if (!currentEntry.heading.trim() && !currentEntry.body.trim()) {
			return;
		}
		setEntries((prev) => [
			...prev,
			{
				heading: currentEntry.heading.trim(),
				date: currentEntry.date.trim(),
				body: currentEntry.body.trim(),
				imageBase64: currentEntry.imageBase64 || undefined,
				imageWidth: currentEntry.imageWidth,
				imageHeight: currentEntry.imageHeight,
			},
		]);
		setCurrentEntry(emptyEntry());
	}, [currentEntry]);

	const downloadPdf = useCallback(async () => {
		setDownloading(true);
		try {
			const blob = await pdf(<MyStoryDocument {...documentProps} />).toBlob();
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
				<h1 className="font-semibold text-2xl text-[#111]">My Story PDF</h1>
				<p className="text-[#666] text-sm">
					Build a cover page and one entry per page, then preview or download.
				</p>
			</header>

			<section className="grid gap-4 rounded-xl border border-[#e6e6e6] bg-white p-5">
				<div className="grid gap-1.5">
					<label htmlFor={titleId} className="font-medium text-sm">
						Title
					</label>
					<Input
						id={titleId}
						value={title}
						onChange={(e) => setTitle(e.target.value)}
						placeholder="Story"
					/>
				</div>
				<div className="grid gap-1.5">
					<label htmlFor={journalNameId} className="font-medium text-sm">
						Journal Name
					</label>
					<Input
						id={journalNameId}
						value={journalName}
						onChange={(e) => setJournalName(e.target.value)}
						placeholder="A journal for Mom"
					/>
				</div>
			</section>

			<section className="grid gap-4 rounded-xl border border-[#e6e6e6] bg-white p-5">
				<h2 className="font-medium text-base">Add entry</h2>
				<div className="grid gap-1.5">
					<label htmlFor={headingId} className="font-medium text-sm">
						Heading
					</label>
					<Input
						id={headingId}
						value={currentEntry.heading}
						onChange={(e) =>
							setCurrentEntry((prev) => ({
								...prev,
								heading: e.target.value,
							}))
						}
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
						placeholder="June 5, 2026"
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
						className="min-h-[120px] w-full rounded-md border border-[#e6e6e6] px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#007A7A]"
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
				<Button type="button" onClick={addEntry} className="w-fit">
					Add Entry
				</Button>
			</section>

			{entries.length > 0 ? (
				<section className="rounded-xl border border-[#e6e6e6] bg-white p-5">
					<h2 className="mb-3 font-medium text-base">
						Entries ({entries.length})
					</h2>
					<ul className="space-y-1 text-sm">
						{entries.map((entry) => (
							<li key={entryListKey(entry)}>
								{entry.heading || "Untitled"}
								{entry.date ? ` — ${entry.date}` : ""}
							</li>
						))}
					</ul>
				</section>
			) : null}

			<div className="flex flex-wrap gap-3">
				<Button type="button" onClick={() => setShowPreview(true)}>
					Preview PDF
				</Button>
				<Button
					type="button"
					variant="outline"
					onClick={() => void downloadPdf()}
					disabled={downloading}
				>
					{downloading ? "Downloading…" : "Download PDF"}
				</Button>
			</div>

			{showPreview ? (
				<section className="overflow-hidden rounded-xl border border-[#e6e6e6] bg-white">
					<div className="flex items-center justify-between border-[#e6e6e6] border-b px-4 py-2">
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
						<MyStoryDocument {...documentProps} />
					</PDFViewer>
				</section>
			) : null}
		</div>
	);
}
