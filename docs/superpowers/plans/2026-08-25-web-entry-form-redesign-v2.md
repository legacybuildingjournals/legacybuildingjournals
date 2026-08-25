# Web Create-Entry Form Redesign — Plan v2 (desktop mockup)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Supersedes:** `2026-08-25-web-entry-form-redesign.md` Tasks 3-8. Tasks 1 and 2 of that plan are already committed (`dc6b424`, `bd33f15`) and still apply.

**Goal:** Bring the web create-journal-entry panel in line with the supplied desktop mockup: three full-width labelled tabs, Title/Date side by side, journal select beneath, an accent capture card for both video and audio, and a square "Upload a file" image tile above the Download/Create row.

**Architecture:** This is a UI-only change. The panel keeps its existing `useState` fields, validation, upload logic, and `createEntry` call exactly as they are. The work is styling, field ordering, one new component (`AudioCaptureCard`), and edits to two shared components (`EntryModeTabs`, `EntryImageUpload`).

**Tech Stack:** React 19, TypeScript strict, Vite, Tailwind v4, lucide-react 1.17, Biome.

## Global Constraints

- **UI only.** Do not convert the form to react-hook-form or Zod. Do not change validation rules, upload logic, or the `createEntry` mutation call. Do not add or remove form fields.
- Scope is `apps/web` only. Do not touch `apps/native`, `apps/admin`, or `packages/`.
- Do not modify `libraryFormStyles.ts`, `CreateJournalDialog.tsx`, `EditJournalDialog.tsx`, or `JournalCoverImageUpload.tsx`.
- `EntryImageUpload.tsx` IS in scope this time (Task 3) and is shared with `EditJournalEntrySidebarForm.tsx`. Changing it is intended so both surfaces stay consistent — but the change must be purely presentational and must not alter its props or `onFileChange` contract.
- Tabs for indentation. TypeScript strict, no `any`. Named exports.
- Import order: package imports, then `@legacy-building/*`, then `@/` aliases, then relative.
- No new npm dependencies.
- Accent colors come from `brand` in `@legacy-building/ui/lib/brand-journal`: writing `brand.primary` (#008080), recording `brand.alert` (#e9a746), video `brand.video` (#e05150). Use these for any color applied via inline `style`. Literal hex inside static Tailwind class strings is the established convention here (Tailwind cannot generate classes from runtime values) — keep those centralized in `entryFormStyles.ts`.
- The Writing tab icon is a supplied custom SVG (teal `#33766F`), not a lucide icon. Its exact path data is in Task 2, Step 1 — copy it verbatim.
- Do not push to any remote.
- **Stage only the files each task names, with explicit paths.** Never `git add -A` or `git add .` — this working tree has unrelated pre-existing modifications (including a staged `packages/backend/convex/_generated/api.d.ts`) that must stay out of every commit.

## Verification approach

`apps/web` has no test framework — no vitest, no testing-library, no test files. Adding one is out of scope. Per `CLAUDE.md`, each task is gated on:

1. `pnpm --filter web check-types` — runs `vite build && tsc --noEmit`, takes 1-3 minutes.
2. `pnpm exec biome check --write apps/web/src/components/journal/library` — scoped so it does not rewrite the whole repo.
3. A written-out manual browser check (a human runs these; subagents cannot).

**Commits are slow:** the pre-commit hook runs `lint-staged` plus a full `turbo build` across 9 packages. Allow 600000 ms. Never use `--no-verify`.

## Target layout (all three tabs)

```
              [Writing Journal] [Recording Journal] [Video Journal]

  Title                              Date
  [________________________]         [Select date___________]

  Select a journal
  [K24 Engine                                              v]

  Your Video                          <- "Your Recording" / "Entry Log"
  +--------------------------------------------------------+
  |                       (o)                               |
  |                Capture Your Memory                      |
  |          Record a new video or choose one               |
  |                from your gallery.                       |
  |   [           Record Video                          ]   |
  |   ------------------- OR -------------------            |
  |   [           Choose From Gallery                   ]   |
  +--------------------------------------------------------+

  Upload image (optional)
  +-------------------+
  |                   |
  |        [+]        |
  |   Upload a file   |
  |                   |
  +-------------------+

              [ Download ]   [ Create ]
```

## File Structure

| File | Responsibility |
| --- | --- |
| `apps/web/src/components/journal/library/WritingJournalIcon.tsx` | **Create.** The supplied quill SVG as a component, color-driven by prop. |
| `apps/web/src/components/journal/library/EntryModeTabs.tsx` | **Modify.** Labels become "... Journal"; writing tab uses the quill SVG. |
| `apps/web/src/components/journal/library/EntryImageUpload.tsx` | **Modify.** Square tile with image-plus icon and "Upload a file" label. |
| `apps/web/src/components/journal/library/AudioCaptureCard.tsx` | **Create.** Amber "Capture Your Memory" card wrapping the existing recorder. |
| `apps/web/src/components/journal/library/AudioRecorderField.tsx` | **Modify.** Additive `autoStart?: boolean` prop, default off. |
| `apps/web/src/components/journal/library/AddJournalEntryPanel.tsx` | **Modify.** Drop the journal-type select, reorder fields, apply new field styling. |
| `apps/web/src/components/journal/library/entryFormStyles.ts` | **Modify.** Add the tile and label classes the new design needs. |

---

### Task 3: Writing icon + tab labels

**Files:**
- Create: `apps/web/src/components/journal/library/WritingJournalIcon.tsx`
- Modify: `apps/web/src/components/journal/library/EntryModeTabs.tsx`

**Interfaces:**
- Produces: `WritingJournalIcon({ className, color }: { className?: string; color?: string })`.
- `EntryModeTabs`'s public props are unchanged from the committed version: `{ value, onChange }`. Do not add or remove props.

- [ ] **Step 1: Create the icon component**

Create `apps/web/src/components/journal/library/WritingJournalIcon.tsx` with exactly this content. The `d` attribute is supplied artwork — copy it character for character:

```tsx
type WritingJournalIconProps = {
	className?: string;
	/** Filled with the tab's current text color so it inverts when active. */
	color?: string;
};

/** Quill mark used by the Writing Journal tab. */
export function WritingJournalIcon({
	className,
	color = "currentColor",
}: WritingJournalIconProps) {
	return (
		<svg
			width="14"
			height="14"
			viewBox="0 0 14 14"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={className}
			aria-hidden
		>
			<path
				d="M10.0049 0.4375L8.50103 1.96875L11.919 5.38672L13.4502 3.88281C13.7419 3.55469 13.8877 3.1901 13.8877 2.78906C13.8877 2.38802 13.7419 2.02344 13.4502 1.69531L12.1924 0.4375C11.8643 0.145833 11.4997 0 11.0987 0C10.6976 0 10.3331 0.145833 10.0049 0.4375ZM7.81743 2.54297L7.57134 2.59766L3.63384 3.80078C3.06874 3.98307 2.67681 4.35677 2.45806 4.92188L0.0518092 12.1406C-0.0575658 12.4688 0.00623628 12.7604 0.243215 13.0156L4.45415 8.83203C4.36301 8.64974 4.31743 8.45833 4.31743 8.25781C4.33566 7.89323 4.46327 7.58333 4.70025 7.32812C4.95546 7.09115 5.26535 6.96354 5.62993 6.94531C5.99452 6.96354 6.30441 7.09115 6.55962 7.32812C6.7966 7.58333 6.92421 7.89323 6.94243 8.25781C6.92421 8.6224 6.7966 8.93229 6.55962 9.1875C6.30441 9.42448 5.99452 9.55208 5.62993 9.57031C5.42941 9.57031 5.23801 9.52474 5.05572 9.43359L0.872122 13.6445C1.12733 13.8815 1.419 13.9453 1.74712 13.8359L8.96587 11.4297C9.53098 11.2109 9.90467 10.819 10.087 10.2539L11.2901 6.31641L11.3448 6.07031L7.81743 2.54297Z"
				fill={color}
			/>
		</svg>
	);
}
```

- [ ] **Step 2: Update the tab labels and the writing icon**

`EntryModeTabs.tsx` currently renders lucide `PenTool` for writing and the labels `Writing` / `Recording` / `Video`. Change the labels and swap the writing icon.

Replace the `MODE_TABS` definition and its types with:

```tsx
type ModeTab = {
	value: EntryMode;
	label: string;
	Icon: LucideIcon | null;
	accent: string;
};

/** Each medium owns an accent: teal writing, amber audio, red video. */
const MODE_TABS: readonly ModeTab[] = [
	{
		value: "writing",
		label: "Writing Journal",
		// Writing uses the supplied quill mark rather than a lucide icon.
		Icon: null,
		accent: brand.primary,
	},
	{
		value: "recording",
		label: "Recording Journal",
		Icon: Mic,
		accent: brand.alert,
	},
	{ value: "video", label: "Video Journal", Icon: Video, accent: brand.video },
];
```

Remove `PenTool` from the lucide import; keep `Mic`, `Video`, and the `LucideIcon` type. Add:

```tsx
import { WritingJournalIcon } from "@/components/journal/library/WritingJournalIcon";
```

Inside the `.map(...)`, replace the single `<Icon .../>` render with a branch that handles the writing tab:

```tsx
						{Icon ? (
							<Icon className="size-4 shrink-0" strokeWidth={2} aria-hidden />
						) : (
							<WritingJournalIcon
								className="size-3.5 shrink-0"
								color={active ? "#ffffff" : brand.primary}
							/>
						)}
```

- [ ] **Step 3: Widen the tab bar for the longer labels**

The labels are now roughly twice as long. Change the container's class from `max-w-[560px]` to `max-w-[760px]`, and change each tab button's text sizing so the labels do not wrap:

```tsx
							"flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-[8px] px-2 py-2.5 text-center font-bold text-xs leading-5 transition-colors sm:gap-2 sm:px-5 sm:text-sm",
```

- [ ] **Step 4: Verify it compiles**

Run: `pnpm --filter web check-types`
Expected: exits 0.

Run: `pnpm exec biome check --write apps/web/src/components/journal/library`
Expected: exits 0.

- [ ] **Step 5: Verify the old icon is gone**

Run: `grep -n "PenTool" apps/web/src/components/journal/library/EntryModeTabs.tsx`
Expected: no output.

- [ ] **Step 6: Manual check (human)**

Open the add-entry panel. The three tabs read `Writing Journal`, `Recording Journal`, `Video Journal`. The writing tab shows the teal quill when inactive and a white quill when active. Labels do not wrap at 1280px.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/journal/library/WritingJournalIcon.tsx apps/web/src/components/journal/library/EntryModeTabs.tsx
git commit -m "feat(web): full tab labels and supplied writing quill icon"
```

---

### Task 4: "Upload a file" image tile

**Files:**
- Modify: `apps/web/src/components/journal/library/entryFormStyles.ts`
- Modify: `apps/web/src/components/journal/library/EntryImageUpload.tsx`

**Interfaces:**
- `EntryImageUpload`'s props are UNCHANGED: `{ accentColor, imagePreview, invalid?, fullWidth?, onFileChange }`. This is a presentational change only. `EditJournalEntrySidebarForm.tsx:395` passes `fullWidth` and must keep working — do not break the `fullWidth` branch.
- Adds to `entryFormStyles.ts`: `uploadTileClass`, `uploadTileLabelClass`.

- [ ] **Step 1: Add the tile classes**

Append to `apps/web/src/components/journal/library/entryFormStyles.ts`:

```ts
/** Square "Upload a file" tile used for the optional entry cover. */
export const uploadTileClass =
	"relative flex aspect-square w-full max-w-[370px] cursor-pointer flex-col items-center justify-center gap-3 overflow-hidden rounded-[10px] border bg-white transition-colors";

export const uploadTileLabelClass = "font-medium text-sm leading-5";
```

- [ ] **Step 2: Restyle the empty state**

In `EntryImageUpload.tsx`, the empty state currently renders only a `Camera` icon. Replace the lucide import:

```tsx
import { ImagePlus } from "lucide-react";
```

(`Camera` is no longer used here — remove it from the import.)

Replace the empty-state branch — the `<Camera ... />` element — with an icon-plus-label stack:

```tsx
					<>
						<ImagePlus
							className="size-10 shrink-0"
							style={{ color: iconColor }}
							strokeWidth={1.5}
							aria-hidden
						/>
						<span
							className={uploadTileLabelClass}
							style={{ color: iconColor }}
						>
							Upload a file
						</span>
					</>
```

Import the class:

```tsx
import { uploadTileLabelClass } from "@/components/journal/library/entryFormStyles";
```

- [ ] **Step 3: Make the non-fullWidth tile square**

The tile is currently `h-[200px] w-[265px]`. The mockup shows a square. In the button's `cn(...)`, replace the fixed size for the non-`fullWidth` case so it reads:

```tsx
				className={cn(
					"relative flex max-w-full cursor-pointer overflow-hidden rounded-[10px] border bg-white transition-colors",
					fullWidth
						? "h-[200px] w-full"
						: "aspect-square w-full max-w-[370px] flex-col items-center justify-center gap-3",
					imagePreview && fullWidth ? "" : "p-3",
					invalid ? "border-[#b0200c]" : "border-[#e9ecef]",
				)}
```

The `fullWidth` branch keeps its existing 200px height so the edit sidebar's sticky cover is unaffected.

- [ ] **Step 4: Verify it compiles**

Run: `pnpm --filter web check-types`
Expected: exits 0.

Run: `pnpm exec biome check --write apps/web/src/components/journal/library`
Expected: exits 0.

- [ ] **Step 5: Verify the shared contract is intact**

Run: `grep -n "type EntryImageUploadProps" -A 12 apps/web/src/components/journal/library/EntryImageUpload.tsx`
Expected: the same five props as before — `accentColor`, `imagePreview`, `invalid`, `fullWidth`, `onFileChange`. No additions, no removals.

- [ ] **Step 6: Manual check (human)**

In the create panel, the image field is a square white tile showing an image-plus icon above "Upload a file", both in the current tab's accent color. Picking an image replaces it with the preview. **Also open the edit-entry sidebar** and confirm its cover area still renders at its old 200px height and still uploads correctly.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/journal/library/entryFormStyles.ts apps/web/src/components/journal/library/EntryImageUpload.tsx
git commit -m "feat(web): square upload-a-file image tile"
```

---

### Task 5: Audio capture card

**Files:**
- Modify: `apps/web/src/components/journal/library/AudioRecorderField.tsx`
- Create: `apps/web/src/components/journal/library/AudioCaptureCard.tsx`

**Why:** the mockup's Recording tab should read like the Video tab. `EntryVideoUpload.tsx` already renders the "Capture Your Memory" card; audio currently shows a bare waveform row with no empty state.

**Interfaces:**
- `AudioRecorderField` gains `autoStart?: boolean`, defaulting to `undefined`. `EditJournalEntrySidebarForm.tsx:335` — its other consumer — must need no edit.
- Produces: `AudioCaptureCard({ accentColor, value, onChange, invalid }: AudioCaptureCardProps)`.

- [ ] **Step 1: Add `autoStart` to the recorder**

In `AudioRecorderField.tsx`, add one field to `AudioRecorderFieldProps` before the closing brace:

```tsx
	/** Begin a recording session as soon as the field mounts. */
	autoStart?: boolean;
```

Add `autoStart,` to the destructured parameter list, before `invalid,`.

- [ ] **Step 2: Fire the auto-start exactly once**

`startRecording` is a plain `async` function declared above the effects, so it is in scope. Find the duration-ticking effect:

```tsx
	useEffect(() => {
		if (!isRecording) return;
		const interval = window.setInterval(() => {
			setDuration((d) => d + 1);
		}, 1000);
		return () => clearInterval(interval);
	}, [isRecording]);
```

Insert immediately after it:

```tsx
	// Mounted by AudioCaptureCard's "Record Audio" button, which has already
	// taken the user's click. The ref guard keeps a re-render from restarting
	// a session that is already live.
	const autoStartedRef = useRef(false);
	useEffect(() => {
		if (!autoStart || autoStartedRef.current) return;
		autoStartedRef.current = true;
		void startRecording();
		// biome-ignore lint/correctness/useExhaustiveDependencies: startRecording is re-created every render; the ref guard makes a single run the contract
	}, [autoStart]);
```

If Biome reports a different rule name for that ignore comment, correct the comment to the name it reports — do not delete the effect.

- [ ] **Step 3: Create the capture card**

Create `apps/web/src/components/journal/library/AudioCaptureCard.tsx` with exactly this content:

```tsx
import { Mic, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { AudioRecorderField } from "@/components/journal/library/AudioRecorderField";
import { CaptureOrDivider } from "@/components/journal/library/CaptureOrDivider";
import {
	captureCardClass,
	captureCopyClass,
	captureFilledButtonClass,
	captureIconCircleClass,
	captureOutlineButtonClass,
	captureTitleClass,
	entryErrorTextClass,
	MAX_AUDIO_BYTES,
} from "@/components/journal/library/entryFormStyles";
import { Button } from "@/components/journal/ui/button";

type AudioCaptureCardProps = {
	accentColor: string;
	value: File | null;
	onChange: (file: File | null) => void;
	invalid?: boolean;
};

/**
 * Empty state for an audio entry, matching the video tab's capture card.
 *
 * The moment a clip exists — recorded here or picked from disk — the existing
 * waveform recorder takes over, so this only owns the empty state.
 */
export function AudioCaptureCard({
	accentColor,
	value,
	onChange,
	invalid,
}: AudioCaptureCardProps) {
	const inputRef = useRef<HTMLInputElement>(null);
	const [recording, setRecording] = useState(false);
	const [error, setError] = useState<string | null>(null);

	function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
		const file = event.target.files?.[0];
		// Reset so re-picking the same file still fires a change event.
		event.target.value = "";
		if (!file) return;
		if (file.size > MAX_AUDIO_BYTES) {
			setError("Audio must be 50 MB or smaller.");
			return;
		}
		setError(null);
		onChange(file);
	}

	const fileInput = (
		<input
			ref={inputRef}
			type="file"
			accept="audio/*"
			className="hidden"
			onChange={handleFile}
		/>
	);

	if (value !== null || recording) {
		return (
			<div className="flex w-full flex-col gap-2">
				<AudioRecorderField
					accentColor={accentColor}
					value={value}
					onChange={(next) => {
						// Deleting the clip drops back to the card.
						if (next === null) setRecording(false);
						onChange(next);
					}}
					autoStart={recording && value === null}
					invalid={invalid}
				/>
				{fileInput}
			</div>
		);
	}

	return (
		<div className="flex w-full flex-col gap-2">
			{error ? (
				<p className={entryErrorTextClass} role="alert">
					{error}
				</p>
			) : null}

			<div
				aria-invalid={invalid}
				className={captureCardClass}
				style={{
					borderColor: invalid ? "#b0200c" : accentColor,
					backgroundColor: `${accentColor}0d`,
				}}
			>
				<span
					className={captureIconCircleClass}
					style={{ backgroundColor: `${accentColor}1a` }}
				>
					<Mic
						className="size-6"
						style={{ color: accentColor }}
						strokeWidth={2}
						aria-hidden
					/>
				</span>

				<h4 className={captureTitleClass}>Capture Your Memory</h4>
				<p className={captureCopyClass}>
					Record a new audio clip or choose one from your files.
				</p>

				<Button
					type="button"
					onClick={() => setRecording(true)}
					className={captureFilledButtonClass}
					style={{ backgroundColor: accentColor }}
				>
					<Mic className="mr-2 size-4" />
					Record Audio
				</Button>

				<CaptureOrDivider />

				<Button
					type="button"
					variant="outline"
					onClick={() => inputRef.current?.click()}
					className={captureOutlineButtonClass}
					style={{ borderColor: accentColor, color: accentColor }}
				>
					<Upload className="mr-2 size-4" />
					Choose From Files
				</Button>
			</div>

			{fileInput}
		</div>
	);
}
```

- [ ] **Step 4: Verify it compiles and the sidebar is untouched**

Run: `pnpm --filter web check-types`
Expected: exits 0.

Run: `pnpm exec biome check --write apps/web/src/components/journal/library`
Expected: exits 0.

Run: `git status --porcelain apps/web/src/components/journal/library/EditJournalEntrySidebarForm.tsx`
Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/journal/library/AudioRecorderField.tsx apps/web/src/components/journal/library/AudioCaptureCard.tsx
git commit -m "feat(web): audio capture card with file picking"
```

The card is not rendered yet — Task 6 wires it in and carries its manual check.

---

### Task 6: Panel layout and field order

**Files:**
- Modify: `apps/web/src/components/journal/library/entryFormStyles.ts`
- Modify: `apps/web/src/components/journal/library/AddJournalEntryPanel.tsx`

**Interfaces:**
- Consumes `AudioCaptureCard` (Task 5) and the restyled `EntryImageUpload` (Task 4).

- [ ] **Step 1: Delete the journal-type select**

The three tabs now carry the audio-vs-video choice, so the `Journal type` select is redundant.

In `AddJournalEntryPanel.tsx`, delete the whole `journalTypeSelect` constant and the whole `recordingSelectRow` constant.

**Keep `journalSelect`** — the mockup shows "Select a journal", and it stays.

In the JSX, replace both `{recordingSelectRow}` references with `{journalSelect}`.

- [ ] **Step 2: Hoist the journal select above the media**

The mockup order is Title/Date, then Select a journal, then the media card, then the image tile.

Remove `{journalSelect}` from inside all three mode branches, and instead render it once immediately AFTER the Title/Date grid and BEFORE the mode branches:

```tsx
						{journalSelect}
```

The `journalSelect` constant already wraps itself in a field stack, so it spans the full column width with no extra wrapper.

- [ ] **Step 3: Apply the new field styling**

In the Title/Date grid, swap the Title input's classes and add the mockup's placeholder:

```tsx
							<div className={entryFieldStack}>
								<label htmlFor={`${formId}-title`} className={entryLabelClass}>
									Title
								</label>
								<Input
									id={`${formId}-title`}
									value={title}
									onChange={(e) => setTitle(e.target.value)}
									className={entryInputClass(showErrors && titleInvalid)}
									aria-invalid={showErrors && titleInvalid}
								/>
							</div>
							<div className={entryFieldStack}>
								<span className={entryLabelClass}>Date</span>
```

Add the imports:

```tsx
import {
	entryFieldStack,
	entryInputClass,
	entryLabelClass,
} from "@/components/journal/library/entryFormStyles";
```

Apply `entryFieldStack` / `entryLabelClass` to the `journalSelect`, `Your Video`, `Your Recording`, and `Upload image (optional)` field stacks too, so every label matches.

Keep the Title/Date grid two-column — `grid-cols-1 sm:grid-cols-2` — as the mockup shows.

- [ ] **Step 4: Rebuild the Video branch**

Replace the whole `mode === "video"` branch body with:

```tsx
							<>
								<div className={entryFieldStack}>
									<span className={entryLabelClass}>Your Video</span>
									<EntryVideoUpload
										accentColor={accent}
										value={videoFile}
										onChange={setVideoFile}
										invalid={showErrors && videoInvalid}
									/>
								</div>
								{showErrors && videoInvalid ? (
									<p className="text-[#b0200c] text-sm" role="alert">
										Choose a video before creating your entry.
									</p>
								) : null}
								{imageUpload}
								<p className="text-[#8a8a8a] text-sm">
									Videos can&apos;t be embedded in the PDF. A QR code is
									generated so anyone reading the journal can scan it to watch
									this memory.
								</p>
							</>
```

The PDF note is kept as quiet muted text beneath the image tile.

- [ ] **Step 5: Rebuild the Recording branch**

Replace the whole final `else` branch body with:

```tsx
							<>
								<div className={entryFieldStack}>
									<span className={entryLabelClass}>Your Recording</span>
									<AudioCaptureCard
										accentColor={accent}
										value={audioFile}
										onChange={setAudioFile}
										invalid={showErrors && audioInvalid}
									/>
								</div>
								{showErrors && audioInvalid ? (
									<p className="text-[#b0200c] text-sm" role="alert">
										Record audio before creating your entry.
									</p>
								) : null}
								{imageUpload}
							</>
						
```

Add the import:

```tsx
import { AudioCaptureCard } from "@/components/journal/library/AudioCaptureCard";
```

Remove the now-unused `AudioRecorderField` import — `AudioCaptureCard` wraps it. Confirm first with `grep -n "AudioRecorderField" apps/web/src/components/journal/library/AddJournalEntryPanel.tsx`.

- [ ] **Step 6: Confirm the Writing branch order**

The Writing branch keeps its `Entry Log` textarea followed by `{imageUpload}`. Since Step 2 hoisted `journalSelect` out, make sure the Writing branch no longer renders it a second time.

Run: `grep -c "{journalSelect}" apps/web/src/components/journal/library/AddJournalEntryPanel.tsx`
Expected: `1`.

- [ ] **Step 7: Verify it compiles with nothing unused**

Run: `pnpm --filter web check-types`
Expected: exits 0.

Run: `pnpm exec biome check --write apps/web/src/components/journal/library`
Expected: exits 0. Biome flags unused imports — this is the gate that catches a missed deletion.

Run: `grep -n "journalTypeSelect\|recordingSelectRow" apps/web/src/components/journal/library/AddJournalEntryPanel.tsx`
Expected: no output.

- [ ] **Step 8: Manual check (human), at 375px / 768px / 1280px**

**Video tab** — red tabs, pink wash. Order: Title + Date side by side, Select a journal, Your Video capture card, Upload image (optional) square tile, PDF note, then Download and Create centered. The capture card shows the circle icon, "Capture Your Memory", a red "Record Video", an OR rule, and an outlined "Choose From Gallery".

**Recording tab** — amber. Same order but "Your Recording" and no PDF note. "Record Audio" starts recording immediately and the waveform replaces the card; deleting the clip returns to the card; "Choose From Files" with an audio file goes straight to the waveform.

**Writing tab** — teal, mint wash, Entry Log textarea, then the image tile.

At 375px, Title and Date stack and nothing scrolls sideways.

- [ ] **Step 9: Commit**

```bash
git add apps/web/src/components/journal/library/entryFormStyles.ts apps/web/src/components/journal/library/AddJournalEntryPanel.tsx
git commit -m "feat(web): entry panel layout matching desktop design"
```

---

## Done criteria

- `pnpm --filter web check-types` exits 0.
- `pnpm exec biome check --write apps/web/src/components/journal/library` exits 0.
- `git status --porcelain apps/native apps/admin packages` shows nothing beyond the pre-existing `api.d.ts` entry.
- All three tabs create entries successfully at 375px, 768px, and 1280px.
- The edit-entry sidebar still renders and uploads its cover correctly (Task 4 touched a shared component).
- Nothing pushed to any remote.
