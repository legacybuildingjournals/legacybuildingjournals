# Web Create-Entry Form Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the web create-journal-entry panel to match the supplied mobile mockup: three tabs, a dashed cover drop zone, accent-tinted capture cards, a PDF Export card, and one centered 680px column at every screen size.

**Architecture:** New style helpers and new components are added alongside the existing ones rather than adding variants to shared components. `AddJournalEntryPanel` switches to the new components; `EditJournalEntrySidebarForm` and the journal dialogs keep importing the old ones and are provably unaffected. Two shared files change: `EntryModeTabs` (only consumer is the panel) and `AudioRecorderField` (gains one additive, defaulted-off prop).

**Tech Stack:** React 19, TypeScript strict, Vite, Tailwind v4, lucide-react 1.17, Convex, Biome.

**Spec:** `docs/superpowers/specs/2026-08-25-web-entry-form-redesign-design.md`

## Global Constraints

- Scope is `apps/web` only. Do not touch `apps/native`, `apps/admin`, or `packages/`.
- Do not modify `EditJournalEntrySidebarForm.tsx`, `CreateJournalDialog.tsx`, `EditJournalDialog.tsx`, `JournalCoverImageUpload.tsx`, or `EntryImageUpload.tsx`.
- Do not modify `libraryFormStyles.ts`. New styles go in a new module.
- Tabs for indentation. TypeScript strict, no `any`.
- Import order: package imports, then `@legacy-building/*`, then `@/` aliases, then relative. Biome fixes this when you run the scoped check below.
- Named exports only for these components.
- No new npm dependencies. Every icon used is already exported by the installed `lucide-react@1.17.0`: `Camera`, `Image`, `Mic`, `PenTool`, `Pencil`, `QrCode`, `Video`, `Upload`.
- Accent colors come from `brand` in `@legacy-building/ui/lib/brand-journal` — never hardcode them: writing `brand.primary` (#008080), recording `brand.alert` (#e9a746), video `brand.video` (#e05150).
- Tasks 1-7 must not change validation rules, upload logic, or the `createEntry` mutation call. Task 8 changes how validation is *expressed* (react-hook-form + Zod) without changing which fields are required or what the mutation receives.
- `MAX_AUDIO_BYTES` is `50 * 1024 * 1024`.
- The PDF Export card renders on the Video tab only.
- Do not push to any remote.

## Verification approach — read this before Task 1

**`apps/web` has no test framework.** There is no vitest, no testing-library, and no `*.test.*` file anywhere in the app. Introducing a test stack is out of scope for this redesign and would add dependencies the constraint above forbids.

Per `CLAUDE.md` ("Before claiming a web change is done, run `pnpm --filter web check-types`"), each task is gated on:

1. `pnpm --filter web check-types` — runs `vite build && tsc --noEmit`. This is the compile-and-typecheck gate. Takes 1-3 minutes.
2. `pnpm exec biome check --write apps/web/src/components/journal/library` — Biome lint and format. This is what catches unused imports left behind by a deletion.
3. An explicit manual browser check, written out per task.

Substitute these for the usual red-green-refactor cycle. Every task below states the exact commands and the exact expected output. Task 2 does contain a genuine red-then-green cycle, driven by the compiler.

**Note on commits:** this repo's pre-commit hook runs `lint-staged` followed by a full `turbo build` across all 9 packages. Commits take several minutes. Allow a generous timeout; do not pass `--no-verify`.

## File Structure

| File | Responsibility |
| --- | --- |
| `apps/web/src/components/journal/library/entryFormStyles.ts` | **Create.** Style helpers for the redesigned panel: column shell, field classes, drop-zone classes, capture-card classes, info-card classes, `MAX_AUDIO_BYTES`. Re-exports `accentForMode` / `surfaceForMode` from `libraryFormStyles` to stay DRY. |
| `apps/web/src/components/journal/library/CaptureOrDivider.tsx` | **Create.** The `rule / OR / rule` separator, used by all three capture surfaces so the markup exists once. |
| `apps/web/src/components/journal/library/EntryVideoUpload.tsx` | **Modify.** Its inline OR divider is replaced by `CaptureOrDivider`. No other change — it already matches the mockup. |
| `apps/web/src/components/journal/library/EntryModeTabs.tsx` | **Modify.** Two text tabs become three icon tabs. Only consumer is `AddJournalEntryPanel`. |
| `apps/web/src/components/journal/library/EntryCoverDropzone.tsx` | **Create.** Full-width dashed cover control with click, drag-and-drop, and a filled preview state. |
| `apps/web/src/components/journal/library/AudioCaptureCard.tsx` | **Create.** Amber empty-state capture card that hands off to `AudioRecorderField` once a clip exists. |
| `apps/web/src/components/journal/library/AudioRecorderField.tsx` | **Modify.** Additive `autoStart?: boolean` prop, default off. |
| `apps/web/src/components/journal/library/EntryPdfExportCard.tsx` | **Create.** Bordered PDF Export info card. |
| `apps/web/src/components/journal/library/AddJournalEntryPanel.tsx` | **Modify.** Remove both selects, collapse journal state, adopt the 680px column, reorder fields, wire in the new components. |

---

### Task 1: Style helpers and shared OR divider

**Files:**
- Create: `apps/web/src/components/journal/library/entryFormStyles.ts`
- Create: `apps/web/src/components/journal/library/CaptureOrDivider.tsx`
- Modify: `apps/web/src/components/journal/library/EntryVideoUpload.tsx`

**Interfaces:**
- Consumes: `cn` from `@legacy-building/ui/lib/utils`; `accentForMode`, `surfaceForMode`, `EntryFormMode` from `libraryFormStyles`.
- Produces: `entryColumnClass`, `entryFieldStack`, `entryLabelClass`, `entryOptionalClass`, `entryCaptionClass`, `entryErrorTextClass`, `entryInputClass(invalid: boolean): string`, `coverDropzoneClass(invalid: boolean, dragging: boolean): string`, `coverPreviewFrameClass`, `coverEditPillClass`, `captureCardClass`, `captureIconCircleClass`, `captureTitleClass`, `captureCopyClass`, `captureFilledButtonClass`, `captureOutlineButtonClass`, `captureOrRowClass`, `captureOrRuleClass`, `captureOrTextClass`, `infoCardClass`, `infoIconCircleClass`, `infoTitleClass`, `infoCopyClass`, `MAX_AUDIO_BYTES`, and re-exported `accentForMode` / `surfaceForMode` / `EntryFormMode`.

- [ ] **Step 1: Create the style module**

Create `apps/web/src/components/journal/library/entryFormStyles.ts` with exactly this content:

```ts
import { cn } from "@legacy-building/ui/lib/utils";

export {
	accentForMode,
	type EntryFormMode,
	surfaceForMode,
} from "@/components/journal/library/libraryFormStyles";

/** Audio picked from disk. Recorded clips are bounded by the recorder itself. */
export const MAX_AUDIO_BYTES = 50 * 1024 * 1024;

/**
 * One centered column at every breakpoint. Below 720px the 680px cap is
 * inert and the 16px padding provides the gutters.
 */
export const entryColumnClass =
	"mx-auto flex w-full max-w-[680px] flex-col gap-6 px-4 pb-8";

export const entryFieldStack = "flex w-full min-w-0 flex-col gap-1.5";

export const entryLabelClass =
	"font-medium text-[#1a1a1a] text-sm leading-[1.4]";

/** The "(optional)" half of a label, tinted to the mode accent by the caller. */
export const entryOptionalClass = "font-normal";

export const entryCaptionClass =
	"mt-2 text-center text-[#6c757d] text-sm leading-5";

export const entryErrorTextClass = "text-[#b0200c] text-sm";

export function entryInputClass(invalid: boolean) {
	return cn(
		"h-12 max-h-12 w-full min-w-0 rounded-[10px] border bg-white px-4 font-normal text-[#1a1a1a] text-sm shadow-none focus-visible:ring-0",
		invalid
			? "border-[#b0200c] focus-visible:border-[#b0200c]"
			: "border-[#e9ecef] focus-visible:border-[#c7c7c7]",
	);
}

/**
 * Dashed cover drop zone. Border color and wash are applied inline by the
 * caller from the mode accent; this only carries the geometry and state.
 */
export function coverDropzoneClass(invalid: boolean, dragging: boolean) {
	return cn(
		"flex w-full flex-col items-center rounded-[12px] border-2 border-dashed px-6 py-7 transition-colors",
		invalid && "border-[#b0200c]",
		dragging && "border-solid",
	);
}

export const coverPreviewFrameClass =
	"relative aspect-[16/10] w-full overflow-hidden rounded-[12px]";

export const coverEditPillClass =
	"absolute top-3 right-3 z-10 flex h-9 cursor-pointer items-center gap-1.5 rounded-full bg-white px-3.5 font-semibold text-[#212529] text-sm shadow-[0_2px_8px_rgba(0,0,0,0.15)] transition-opacity hover:opacity-90";

export const captureCardClass =
	"flex w-full flex-col items-center rounded-[12px] border p-6";

export const captureIconCircleClass =
	"mb-3 flex size-12 items-center justify-center rounded-full";

export const captureTitleClass =
	"font-semibold text-[#212529] text-base leading-6";

export const captureCopyClass =
	"mt-1.5 max-w-[240px] text-center text-[#6c757d] text-sm leading-5";

export const captureFilledButtonClass =
	"mt-5 h-11 w-full rounded-[8px] font-semibold text-sm text-white shadow-none transition-opacity hover:opacity-95 active:scale-[0.99]";

export const captureOutlineButtonClass =
	"h-11 w-full rounded-[8px] bg-white font-semibold text-sm shadow-none transition-colors hover:bg-white hover:opacity-90 active:scale-[0.99]";

export const captureOrRowClass = "flex w-full items-center gap-3 py-3";

export const captureOrRuleClass = "h-px flex-1 bg-[#e9ecef]";

export const captureOrTextClass = "text-[#6c757d] text-xs";

export const infoCardClass =
	"flex w-full items-start gap-3 rounded-[12px] border p-4";

export const infoIconCircleClass =
	"flex size-10 shrink-0 items-center justify-center rounded-full";

export const infoTitleClass =
	"font-semibold text-[#212529] text-base leading-6";

export const infoCopyClass = "text-[#6c757d] text-sm leading-5";
```

- [ ] **Step 2: Create the shared OR divider**

All three capture surfaces show the same `rule / OR / rule` separator. Write it once.

Create `apps/web/src/components/journal/library/CaptureOrDivider.tsx` with exactly this content:

```tsx
import {
	captureOrRowClass,
	captureOrRuleClass,
	captureOrTextClass,
} from "@/components/journal/library/entryFormStyles";

/** The "or pick one instead" separator shared by every capture surface. */
export function CaptureOrDivider() {
	return (
		<div className={captureOrRowClass}>
			<span className={captureOrRuleClass} />
			<span className={captureOrTextClass}>OR</span>
			<span className={captureOrRuleClass} />
		</div>
	);
}
```

- [ ] **Step 3: Point the existing video upload at it**

`EntryVideoUpload.tsx` already renders this markup inline. Find:

```tsx
					<div className="flex w-full items-center gap-3 py-3">
						<span className="h-px flex-1 bg-[#e9ecef]" />
						<span className="text-[#6c757d] text-xs">OR</span>
						<span className="h-px flex-1 bg-[#e9ecef]" />
					</div>
```

Replace with:

```tsx
					<CaptureOrDivider />
```

Add the import:

```tsx
import { CaptureOrDivider } from "@/components/journal/library/CaptureOrDivider";
```

Change nothing else in `EntryVideoUpload.tsx`.

- [ ] **Step 4: Verify it compiles**

Run: `pnpm --filter web check-types`
Expected: exits 0. No TypeScript errors. Unused exports are not errors.

- [ ] **Step 5: Verify lint and formatting**

Run: `pnpm exec biome check --write apps/web/src/components/journal/library`
Expected: exits 0. If Biome rewrites formatting, accept its output.

- [ ] **Step 6: Manual check that the video divider is unchanged on screen**

Run `pnpm run dev:web`, open the add-entry panel, switch to the Recording tab and pick `Video Journal` from the `Journal type` select (that select still exists until Task 3).
Expected: the video capture card looks exactly as before — a thin grey rule, `OR`, another rule, between `Record Video` and `Choose From Gallery`.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/journal/library/entryFormStyles.ts apps/web/src/components/journal/library/CaptureOrDivider.tsx apps/web/src/components/journal/library/EntryVideoUpload.tsx
git commit -m "feat(web): add entry form style helpers and shared OR divider"
```

---

### Task 2: Three-tab mode switcher

**Files:**
- Modify: `apps/web/src/components/journal/library/EntryModeTabs.tsx` (full rewrite)
- Modify: `apps/web/src/components/journal/library/AddJournalEntryPanel.tsx` (one line)

**Interfaces:**
- Consumes: `brand` from `@legacy-building/ui/lib/brand-journal`; `cn` from `@legacy-building/ui/lib/utils`; `LucideIcon`, `Mic`, `PenTool`, `Video` from `lucide-react`.
- Produces: `EntryMode` (unchanged union `"writing" | "recording" | "video"`) and `EntryModeTabs({ value, onChange }: EntryModeTabsProps)`. **The `accent` prop is removed** — each tab now owns a fixed color.

`AddJournalEntryPanel.tsx` is the only consumer (`grep -rln "EntryModeTabs" apps/web/src` returns just the panel and the file itself), so removing the prop breaks nothing else.

- [ ] **Step 1: Rewrite the component**

Replace the entire contents of `apps/web/src/components/journal/library/EntryModeTabs.tsx` with:

```tsx
import { brand } from "@legacy-building/ui/lib/brand-journal";
import { cn } from "@legacy-building/ui/lib/utils";
import { type LucideIcon, Mic, PenTool, Video } from "lucide-react";

export type EntryMode = "writing" | "recording" | "video";

type EntryModeTabsProps = {
	value: EntryMode;
	onChange: (mode: EntryMode) => void;
};

type ModeTab = {
	value: EntryMode;
	label: string;
	Icon: LucideIcon;
	accent: string;
};

/** Each medium owns an accent: teal writing, amber audio, red video. */
const MODE_TABS: readonly ModeTab[] = [
	{ value: "writing", label: "Writing", Icon: PenTool, accent: brand.primary },
	{ value: "recording", label: "Recording", Icon: Mic, accent: brand.alert },
	{ value: "video", label: "Video", Icon: Video, accent: brand.video },
];

/**
 * Writing | Recording | Video switcher.
 *
 * Three tabs rather than two: video used to hide behind a "Journal type"
 * select once Recording was active, which buried a top-level choice.
 */
export function EntryModeTabs({ value, onChange }: EntryModeTabsProps) {
	return (
		<div
			className="inline-flex w-full max-w-[560px] rounded-[12px] border border-[#e9ecef] bg-white p-1 shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
			role="tablist"
			aria-label="Entry mode"
		>
			{MODE_TABS.map(({ value: mode, label, Icon, accent }) => {
				const active = value === mode;
				return (
					<button
						key={mode}
						type="button"
						role="tab"
						aria-selected={active}
						onClick={() => onChange(mode)}
						className={cn(
							"flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-[8px] px-2 py-2.5 text-center font-bold text-xs leading-5 transition-colors sm:gap-2 sm:px-4 sm:text-sm",
							active && "text-white",
						)}
						style={active ? { backgroundColor: accent } : { color: accent }}
					>
						<Icon className="size-4 shrink-0" strokeWidth={2} aria-hidden />
						{label}
					</button>
				);
			})}
		</div>
	);
}
```

- [ ] **Step 2: Verify the prop is gone from the public type**

Run: `grep -n "accent" apps/web/src/components/journal/library/EntryModeTabs.tsx`
Expected: matches only inside `ModeTab`, `MODE_TABS`, and the map callback. There must be **no** `accent` inside `EntryModeTabsProps`.

- [ ] **Step 3: Run the compiler to confirm it goes red at the old call site**

Run: `pnpm --filter web check-types`
Expected: **FAILS** with an error in `AddJournalEntryPanel.tsx` on the `<EntryModeTabs ... accent={accent} />` line, along these lines:

```
error TS2322: Type '{ value: EntryMode; onChange: Dispatch<SetStateAction<EntryMode>>; accent: string; }' is not assignable to type 'IntrinsicAttributes & EntryModeTabsProps'.
  Property 'accent' does not exist on type 'IntrinsicAttributes & EntryModeTabsProps'.
```

This is the expected red state: it proves the compiler enforces the prop removal and pins the exact line to fix. Do not fix it yet.

- [ ] **Step 4: Make it green with the minimal call-site edit**

In `apps/web/src/components/journal/library/AddJournalEntryPanel.tsx`, find:

```tsx
						<EntryModeTabs value={mode} onChange={setMode} accent={accent} />
```

Replace with:

```tsx
						<EntryModeTabs value={mode} onChange={setMode} />
```

Change nothing else in the panel in this task.

- [ ] **Step 5: Verify it goes green**

Run: `pnpm --filter web check-types`
Expected: exits 0.

Run: `pnpm exec biome check --write apps/web/src/components/journal/library`
Expected: exits 0.

- [ ] **Step 6: Manual check**

Run `pnpm run dev:web`, open `http://localhost:5173`, sign in, go to the Library, open a journal's add-entry panel.
Expected: three tabs read `Writing`, `Recording`, `Video`, each with an icon. Clicking each fills it with teal, amber, and red respectively and repaints the panel wash to match. The stale `Journal type` select is still on screen — Task 3 removes it.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/journal/library/EntryModeTabs.tsx apps/web/src/components/journal/library/AddJournalEntryPanel.tsx
git commit -m "feat(web): three-tab entry mode switcher"
```

---

### Task 3: Remove both selects from the panel

**Files:**
- Modify: `apps/web/src/components/journal/library/AddJournalEntryPanel.tsx`

**Interfaces:**
- Consumes: `EntryModeTabs` from Task 2.
- Produces: a panel whose journal target is always the `journalId` prop. Task 7 builds the new layout on top of this.

**Why this is safe:** every entry point sets a concrete journal before opening the panel — `DashboardDeskPage.tsx:52`, `DashboardLibraryPage.tsx:56` (router state via `RecentJournalCard`), and `DashboardLibraryPage.tsx:114`. The panel already early-returns `null` when `journalId` is absent, so the select can never rescue a missing journal today.

- [ ] **Step 1: Delete the journal queries and the derived options list**

Remove these blocks entirely:

```tsx
	const allJournals = useQuery(
		api.journal.queries.listByType,
		open ? {} : "skip",
	);
	const preselectedJournal = useQuery(
		api.journal.queries.getById,
		open && journalId ? { id: journalId } : "skip",
	);

	const journalOptions = useMemo((): JournalWithCover[] => {
		const list = (allJournals ?? []) as JournalWithCover[];
		if (
			preselectedJournal &&
			!list.some((journal) => journal._id === preselectedJournal._id)
		) {
			return [preselectedJournal as JournalWithCover, ...list];
		}
		return list;
	}, [allJournals, preselectedJournal]);
```

Also delete the now-unused type alias near the top of the file:

```tsx
type JournalWithCover = Doc<"journals"> & { coverImageUrl?: string };
```

- [ ] **Step 2: Collapse the journal state onto the prop**

Delete the state declaration:

```tsx
	const [selectedJournalId, setSelectedJournalId] =
		useState<Id<"journals"> | null>(journalId);
```

Delete this line from inside `resetForm`:

```tsx
		setSelectedJournalId(journalId);
```

Delete this line from inside the `open` effect:

```tsx
			if (journalId) setSelectedJournalId(journalId);
```

Delete the validity flag:

```tsx
	const journalInvalid = selectedJournalId === null;
```

In the `isValid` expression, remove the `!journalInvalid &&` term so it reads exactly:

```tsx
	const isValid =
		!titleInvalid &&
		!dateInvalid &&
		(mode === "writing"
			? !bodyInvalid
			: mode === "video"
				? !videoInvalid
				: !audioInvalid);
```

In `handleCreate`, find the guard:

```tsx
		if (!isValid || !selectedJournalId || date === undefined) return;
```

Replace with:

```tsx
		if (!isValid || !journalId || date === undefined) return;
```

Find the mutation argument:

```tsx
			await createEntry({
				journalId: selectedJournalId,
```

Replace with:

```tsx
			await createEntry({
				journalId,
```

- [ ] **Step 3: Delete the two select blocks and the row that held them**

Delete the entire `journalSelect` constant, the entire `journalTypeSelect` constant, and the entire `recordingSelectRow` constant — all three are `const ... = ( ... );` JSX blocks.

In the JSX below them, delete the two `{recordingSelectRow}` references (one in the `video` branch, one in the recording `else` branch) and the single `{journalSelect}` reference in the `writing` branch.

- [ ] **Step 4: Remove the imports those blocks used**

Delete the whole `Select` import block:

```tsx
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/journal/ui/select";
```

From the `libraryFormStyles` import, remove `bubbleSelectContentClass`, `bubbleSelectItemClass`, and `bubbleSelectTriggerClass`.

Then check each of these before deleting, because other code may still use them:

- `grep -n "useMemo" apps/web/src/components/journal/library/AddJournalEntryPanel.tsx` — if no hits remain, drop `useMemo` from the React import.
- `grep -n "Doc<" apps/web/src/components/journal/library/AddJournalEntryPanel.tsx` — if no hits remain, drop `Doc` from the dataModel import.
- `grep -n "useQuery" apps/web/src/components/journal/library/AddJournalEntryPanel.tsx` — if no hits remain, change `import { useMutation, useQuery } from "convex/react";` to `import { useMutation } from "convex/react";`.

The `api` import must stay: `createEntry` and `generateUploadUrl` still use it.

- [ ] **Step 5: Verify it compiles with no unused symbols**

Run: `pnpm --filter web check-types`
Expected: exits 0.

Run: `pnpm exec biome check --write apps/web/src/components/journal/library`
Expected: exits 0. Biome flags unused imports, so this is the gate that catches anything missed in Step 4.

- [ ] **Step 6: Verify the selects are fully gone**

Run: `grep -n "selectedJournalId\|journalOptions\|journalTypeSelect\|recordingSelectRow\|journalInvalid\|JournalWithCover" apps/web/src/components/journal/library/AddJournalEntryPanel.tsx`
Expected: no output.

- [ ] **Step 7: Manual check**

Run `pnpm run dev:web` and open the add-entry panel from the Library.
Expected: no `Select a journal` field and no `Journal type` field on any tab. Creating an entry from the Recording tab still saves it to the journal you opened the panel from, and it appears in that journal's entry list. Switching to the Video tab and creating still works. The layout is still the old two-column one — Task 7 changes that.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/components/journal/library/AddJournalEntryPanel.tsx
git commit -m "refactor(web): drop journal and journal-type selects from entry panel"
```

---

### Task 4: Cover image drop zone

**Files:**
- Create: `apps/web/src/components/journal/library/EntryCoverDropzone.tsx`

**Interfaces:**
- Consumes: `captureFilledButtonClass`, `captureOutlineButtonClass`, `coverDropzoneClass`, `coverEditPillClass`, `coverPreviewFrameClass`, `entryCaptionClass`, `entryErrorTextClass` and the `CaptureOrDivider` component from Task 1; `Button` from `@/components/journal/ui/button`.
- Produces:

```ts
type EntryCoverDropzoneProps = {
	accentColor: string;
	imagePreview: string | null;
	/** Video entries call the cover a thumbnail; the others call it an image. */
	isVideo: boolean;
	onFileSelected: (file: File) => void | Promise<void>;
};
export function EntryCoverDropzone(props: EntryCoverDropzoneProps)
```

Task 7 supplies `onFileSelected` and owns compression and the preview-URL lifecycle. This component does neither.

- [ ] **Step 1: Create the component**

Create `apps/web/src/components/journal/library/EntryCoverDropzone.tsx` with exactly this content:

```tsx
import { cn } from "@legacy-building/ui/lib/utils";
import { Camera, Image as ImageIcon, Pencil } from "lucide-react";
import { useRef, useState } from "react";
import { CaptureOrDivider } from "@/components/journal/library/CaptureOrDivider";
import {
	captureFilledButtonClass,
	captureOutlineButtonClass,
	coverDropzoneClass,
	coverEditPillClass,
	coverPreviewFrameClass,
	entryCaptionClass,
	entryErrorTextClass,
} from "@/components/journal/library/entryFormStyles";
import { Button } from "@/components/journal/ui/button";

type EntryCoverDropzoneProps = {
	accentColor: string;
	imagePreview: string | null;
	/** Video entries call the cover a thumbnail; the others call it an image. */
	isVideo: boolean;
	onFileSelected: (file: File) => void | Promise<void>;
};

const CAPTION = "The image will be used as the cover of your journal entry.";

/**
 * Full-width cover control.
 *
 * A dashed box reads as droppable on the web, so it accepts a dropped file as
 * well as a click. Both buttons open the same picker: desktop has no separate
 * camera source, but the pair is kept so the layout matches the mobile app.
 */
export function EntryCoverDropzone({
	accentColor,
	imagePreview,
	isVideo,
	onFileSelected,
}: EntryCoverDropzoneProps) {
	const inputRef = useRef<HTMLInputElement>(null);
	const [dragging, setDragging] = useState(false);
	const [error, setError] = useState<string | null>(null);

	function selectFile(file: File | undefined) {
		if (!file) return;
		if (!file.type.startsWith("image/")) {
			setError("Choose an image file for the cover.");
			return;
		}
		setError(null);
		void onFileSelected(file);
	}

	function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
		const file = event.target.files?.[0];
		// Reset so re-picking the same file still fires a change event.
		event.target.value = "";
		selectFile(file);
	}

	function handleDrop(event: React.DragEvent<HTMLDivElement>) {
		event.preventDefault();
		setDragging(false);
		selectFile(event.dataTransfer.files?.[0]);
	}

	function handleDragOver(event: React.DragEvent<HTMLDivElement>) {
		event.preventDefault();
		setDragging(true);
	}

	const fileInput = (
		<input
			ref={inputRef}
			type="file"
			accept="image/*"
			className="hidden"
			onChange={handleInputChange}
		/>
	);

	const errorLine = error ? (
		<p className={cn(entryErrorTextClass, "mt-2")} role="alert">
			{error}
		</p>
	) : null;

	if (imagePreview) {
		return (
			<div className="flex w-full flex-col">
				<div className={coverPreviewFrameClass}>
					<img
						src={imagePreview}
						alt="Entry cover preview"
						decoding="async"
						className="size-full object-cover"
					/>
					<button
						type="button"
						onClick={() => inputRef.current?.click()}
						className={coverEditPillClass}
					>
						<Pencil className="size-4" strokeWidth={2} aria-hidden />
						{isVideo ? "Edit Thumbnail" : "Edit Image"}
					</button>
				</div>
				<p className={entryCaptionClass}>{CAPTION}</p>
				{errorLine}
				{fileInput}
			</div>
		);
	}

	return (
		<div className="flex w-full flex-col">
			{/* biome-ignore lint/a11y/noStaticElementInteractions: drop is a convenience over the two buttons inside, which carry the accessible affordance */}
			<div
				className={coverDropzoneClass(false, dragging)}
				style={{
					borderColor: accentColor,
					backgroundColor: dragging ? `${accentColor}1a` : `${accentColor}0d`,
				}}
				onDrop={handleDrop}
				onDragOver={handleDragOver}
				onDragLeave={() => setDragging(false)}
			>
				<p className="mb-4 text-center text-[#6c757d] text-sm leading-5">
					{isVideo
						? "Attach a video thumbnail of your choice"
						: "Attach an image of your choice"}
				</p>

				<Button
					type="button"
					onClick={() => inputRef.current?.click()}
					className={cn(captureFilledButtonClass, "mt-0")}
					style={{ backgroundColor: accentColor }}
				>
					<Camera className="mr-2 size-4" />
					Add Image
				</Button>

				<CaptureOrDivider />

				<Button
					type="button"
					variant="outline"
					onClick={() => inputRef.current?.click()}
					className={captureOutlineButtonClass}
					style={{ borderColor: accentColor, color: accentColor }}
				>
					<ImageIcon className="mr-2 size-4" />
					Choose From Gallery
				</Button>
			</div>

			<p className={entryCaptionClass}>{CAPTION}</p>
			{errorLine}
			{fileInput}
		</div>
	);
}
```

- [ ] **Step 2: Verify it compiles**

Run: `pnpm --filter web check-types`
Expected: exits 0.

- [ ] **Step 3: Verify lint**

Run: `pnpm exec biome check --write apps/web/src/components/journal/library`
Expected: exits 0. If Biome reports that the `biome-ignore` rule name is unknown or wrong for this version, read the rule name it actually reports and correct the comment to match. Do not delete the drag handlers to silence it.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/journal/library/EntryCoverDropzone.tsx
git commit -m "feat(web): add cover image drop zone for entry panel"
```

The component is not rendered anywhere yet — Task 7 wires it in, and its manual check happens there.

---

### Task 5: Audio capture card

**Files:**
- Modify: `apps/web/src/components/journal/library/AudioRecorderField.tsx`
- Create: `apps/web/src/components/journal/library/AudioCaptureCard.tsx`

**Interfaces:**
- Consumes: `AudioRecorderField` with its new `autoStart` prop; `MAX_AUDIO_BYTES`, `captureCardClass`, `captureCopyClass`, `captureFilledButtonClass`, `captureIconCircleClass`, `captureOutlineButtonClass`, `captureTitleClass`, `entryErrorTextClass` and the `CaptureOrDivider` component from Task 1.
- Produces:

```ts
type AudioCaptureCardProps = {
	accentColor: string;
	value: File | null;
	onChange: (file: File | null) => void;
	invalid?: boolean;
};
export function AudioCaptureCard(props: AudioCaptureCardProps)
```

`AudioRecorderField`'s prop type gains `autoStart?: boolean`. It defaults to `undefined`, so `EditJournalEntrySidebarForm.tsx:335` — the other consumer — keeps its current behaviour with no edit at all.

- [ ] **Step 1: Add the `autoStart` prop to the recorder**

In `apps/web/src/components/journal/library/AudioRecorderField.tsx`, find the props type:

```tsx
type AudioRecorderFieldProps = {
	accentColor: string;
	value: File | null;
	onChange: (file: File | null) => void;
	/** Saved recording URL when editing an entry that already has audio. */
	existingAudioUrl?: string | null;
	/** Called when the user removes the saved recording so they can record again. */
	onExistingAudioClear?: () => void;
	invalid?: boolean;
};
```

Add one field before the closing brace:

```tsx
	/** Begin a recording session as soon as the field mounts. */
	autoStart?: boolean;
```

Then find the destructured parameter list:

```tsx
export function AudioRecorderField({
	accentColor,
	value,
	onChange,
	existingAudioUrl,
	onExistingAudioClear,
	invalid,
}: AudioRecorderFieldProps) {
```

Add `autoStart,` before `invalid,`:

```tsx
export function AudioRecorderField({
	accentColor,
	value,
	onChange,
	existingAudioUrl,
	onExistingAudioClear,
	autoStart,
	invalid,
}: AudioRecorderFieldProps) {
```

- [ ] **Step 2: Fire the auto-start exactly once**

`startRecording` is a plain `async` function declared above the effects, so it is in scope. Find the existing duration-ticking effect:

```tsx
	useEffect(() => {
		if (!isRecording) return;
		const interval = window.setInterval(() => {
			setDuration((d) => d + 1);
		}, 1000);
		return () => clearInterval(interval);
	}, [isRecording]);
```

Insert this immediately after it:

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

- [ ] **Step 3: Verify the recorder compiles and the other consumer is untouched**

Run: `pnpm --filter web check-types`
Expected: exits 0.

Run: `git diff --stat -- apps/web/src/components/journal/library/EditJournalEntrySidebarForm.tsx`
Expected: no output. The edit sidebar must have zero changes.

- [ ] **Step 4: Create the capture card**

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

- [ ] **Step 5: Verify it compiles**

Run: `pnpm --filter web check-types`
Expected: exits 0.

Run: `pnpm exec biome check --write apps/web/src/components/journal/library`
Expected: exits 0. If Biome rejects either `biome-ignore` rule name, read the name it reports and correct the comment rather than deleting the effect.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/journal/library/AudioRecorderField.tsx apps/web/src/components/journal/library/AudioCaptureCard.tsx
git commit -m "feat(web): add audio capture card with file picking"
```

The card is not rendered anywhere yet — Task 7 wires it in.

---

### Task 6: PDF Export card

**Files:**
- Create: `apps/web/src/components/journal/library/EntryPdfExportCard.tsx`

**Interfaces:**
- Consumes: `infoCardClass`, `infoCopyClass`, `infoIconCircleClass`, `infoTitleClass` from Task 1; `QrCode` from `lucide-react`.
- Produces:

```ts
type EntryPdfExportCardProps = { accentColor: string };
export function EntryPdfExportCard(props: EntryPdfExportCardProps)
```

- [ ] **Step 1: Create the component**

Create `apps/web/src/components/journal/library/EntryPdfExportCard.tsx` with exactly this content:

```tsx
import { QrCode } from "lucide-react";
import {
	infoCardClass,
	infoCopyClass,
	infoIconCircleClass,
	infoTitleClass,
} from "@/components/journal/library/entryFormStyles";

type EntryPdfExportCardProps = {
	accentColor: string;
};

/**
 * Video only: a clip can't live inside a PDF, so the export substitutes a QR
 * code. Audio embeds a player link instead and needs no such warning.
 */
export function EntryPdfExportCard({ accentColor }: EntryPdfExportCardProps) {
	return (
		<div
			className={infoCardClass}
			style={{
				borderColor: accentColor,
				backgroundColor: `${accentColor}0d`,
			}}
		>
			<span
				className={infoIconCircleClass}
				style={{ backgroundColor: `${accentColor}1a` }}
			>
				<QrCode
					className="size-5"
					style={{ color: accentColor }}
					strokeWidth={2}
					aria-hidden
				/>
			</span>
			<div className="flex min-w-0 flex-col gap-1">
				<h4 className={infoTitleClass}>PDF Export</h4>
				<p className={infoCopyClass}>
					Videos can&apos;t be embedded in the PDF. A QR code is generated so
					anyone reading the journal can scan it to watch this memory.
				</p>
			</div>
		</div>
	);
}
```

- [ ] **Step 2: Verify it compiles**

Run: `pnpm --filter web check-types`
Expected: exits 0.

Run: `pnpm exec biome check --write apps/web/src/components/journal/library`
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/journal/library/EntryPdfExportCard.tsx
git commit -m "feat(web): add PDF export info card"
```

---

### Task 7: Wire the new layout into the panel

**Files:**
- Modify: `apps/web/src/components/journal/library/AddJournalEntryPanel.tsx`

**Interfaces:**
- Consumes: `EntryModeTabs` (Task 2), `EntryCoverDropzone` (Task 4), `AudioCaptureCard` (Task 5), `EntryPdfExportCard` (Task 6), and `entryColumnClass`, `entryFieldStack`, `entryInputClass`, `entryLabelClass`, `entryOptionalClass` (Task 1).
- Produces: the finished panel. Nothing consumes it further.

- [ ] **Step 1: Add the new imports and drop the direct recorder import**

Add these imports to `AddJournalEntryPanel.tsx` — Biome will sort them on `pnpm exec biome check --write apps/web/src/components/journal/library`:

```tsx
import { AudioCaptureCard } from "@/components/journal/library/AudioCaptureCard";
import { EntryCoverDropzone } from "@/components/journal/library/EntryCoverDropzone";
import { EntryPdfExportCard } from "@/components/journal/library/EntryPdfExportCard";
import {
	entryColumnClass,
	entryFieldStack,
	entryInputClass,
	entryLabelClass,
	entryOptionalClass,
} from "@/components/journal/library/entryFormStyles";
```

Remove the now-unused direct import, because `AudioCaptureCard` wraps it:

```tsx
import { AudioRecorderField } from "@/components/journal/library/AudioRecorderField";
```

Keep the `EntryImageUpload` import: the Writing tab still uses it.

- [ ] **Step 2: Change the image handler to take a File**

The old handler took a change event, but a dropped file never arrives as one. Find:

```tsx
	const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const raw = e.target.files?.[0];
		if (!raw) return;
		const file = await compressImageFile(raw);
		if (imagePreview?.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
		setImageFile(file);
		setImagePreview(URL.createObjectURL(file));
	};
```

Replace with both of these — the Writing tab's `EntryImageUpload` still needs the event form:

```tsx
	const handleImageFile = async (raw: File) => {
		const file = await compressImageFile(raw);
		if (imagePreview?.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
		setImageFile(file);
		setImagePreview(URL.createObjectURL(file));
	};

	const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const raw = e.target.files?.[0];
		if (!raw) return;
		await handleImageFile(raw);
	};
```

- [ ] **Step 3: Replace the `imageUpload` block with two mode-specific fields**

Find the existing `imageUpload` constant — the one whose label reads `Upload cover image (optional)` — and replace the whole constant with these two:

```tsx
	/** Video calls it a thumbnail because the clip itself is the entry. */
	const coverField = (
		<div className={entryFieldStack}>
			<span className={entryLabelClass}>
				Cover Image{" "}
				<span className={entryOptionalClass} style={{ color: accent }}>
					(optional)
				</span>
			</span>
			<EntryCoverDropzone
				accentColor={accent}
				imagePreview={imagePreview}
				isVideo={mode === "video"}
				onFileSelected={handleImageFile}
			/>
		</div>
	);

	const writingImageUpload = (
		<div className={bubbleFieldStack}>
			<span className={bubbleLabelClass}>Upload image (optional)</span>
			<EntryImageUpload
				accentColor={accent}
				imagePreview={imagePreview}
				onFileChange={handleImageChange}
			/>
		</div>
	);
```

- [ ] **Step 4: Swap the form shell to the 680px column**

Find the form element:

```tsx
					<form
						id={formId}
						className={bubbleFormShell}
```

Replace `bubbleFormShell` with `entryColumnClass`:

```tsx
					<form
						id={formId}
						className={entryColumnClass}
```

Also drop the scroll container's 1200px cap, so the column centers in the viewport rather than inside a 1200px box. Find:

```tsx
				className="min-h-0 w-full max-w-[1200px] flex-1"
```

Replace with:

```tsx
				className="min-h-0 w-full flex-1"
```

Then run `grep -n "bubbleFormShell" apps/web/src/components/journal/library/AddJournalEntryPanel.tsx` and, if there are no hits left, remove `bubbleFormShell` from the `libraryFormStyles` import.

- [ ] **Step 5: Put the cover above Title and Date**

The cover must render before the Title/Date grid on the Recording and Video tabs. Insert this line immediately **above** the Title/Date grid wrapper, as the first child of the form:

```tsx
						{mode === "writing" ? null : coverField}
```

- [ ] **Step 6: Unstack the Title / Date row**

Find the grid wrapper around the Title and Date fields:

```tsx
						<div
							className={cn(
								"grid w-full grid-cols-1 sm:grid-cols-2",
								bubbleRowGap24,
							)}
						>
```

The Writing tab keeps its two-column grid; Recording and Video go single-column. Replace that opening tag with:

```tsx
						<div
							className={cn(
								"grid w-full grid-cols-1",
								mode === "writing" && "sm:grid-cols-2",
								bubbleRowGap24,
							)}
						>
```

Inside it, swap the Title and Date field classes to the new ones and add the mockup's placeholder. Find:

```tsx
							<div className={bubbleFieldStack}>
								<label htmlFor={`${formId}-title`} className={bubbleLabelClass}>
									Title
								</label>
								<Input
									id={`${formId}-title`}
									value={title}
									onChange={(e) => setTitle(e.target.value)}
									className={bubbleInputClass(showErrors && titleInvalid)}
									aria-invalid={showErrors && titleInvalid}
								/>
							</div>
							<div className={bubbleFieldStack}>
								<span className={bubbleLabelClass}>Date</span>
```

Replace with:

```tsx
							<div className={entryFieldStack}>
								<label htmlFor={`${formId}-title`} className={entryLabelClass}>
									Title
								</label>
								<Input
									id={`${formId}-title`}
									value={title}
									onChange={(e) => setTitle(e.target.value)}
									placeholder="Give your journal a title"
									className={entryInputClass(showErrors && titleInvalid)}
									aria-invalid={showErrors && titleInvalid}
								/>
							</div>
							<div className={entryFieldStack}>
								<span className={entryLabelClass}>Date</span>
```

- [ ] **Step 7: Rebuild the Video branch in mockup order**

Replace the whole body of the `mode === "video"` branch with:

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
								<EntryPdfExportCard accentColor={accent} />
							</>
```

The cover is no longer inside this branch — Step 5 hoisted it above Title/Date — and the grey PDF paragraph is replaced by the card.

- [ ] **Step 8: Rebuild the Recording branch**

Replace the whole body of the final `else` branch — the audio one — with:

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
							</>
```

No PDF card here — that is Video only.

- [ ] **Step 9: Point the Writing branch at its own image field**

In the `mode === "writing"` branch, change the `{imageUpload}` reference to:

```tsx
								{writingImageUpload}
```

Everything else in the Writing branch stays exactly as it is.

- [ ] **Step 10: Clean up the now-unused style imports**

Steps 4 and 6 replaced the last uses of two helpers from `libraryFormStyles`. Check each before deleting, since the Writing branch still uses several of them:

- `grep -n "bubbleInputClass" apps/web/src/components/journal/library/AddJournalEntryPanel.tsx` — its only two uses were the Title `Input` (swapped in Step 6) and `bubbleSelectTriggerClass` (deleted in Task 3), so expect no hits. If none, remove `bubbleInputClass` from the import.
- `grep -n "bubbleFormShell" apps/web/src/components/journal/library/AddJournalEntryPanel.tsx` — removed in Step 4 if not already done.

These must stay, because the Writing branch and the button row still use them: `bubbleFieldStack`, `bubbleLabelClass`, `bubbleRowGap24`, `bubbleTextareaClass`, `bubbleCreateButtonClass`, `bubbleDownloadButtonClass`, `accentForMode`, `surfaceForMode`. Confirm each with a `grep` before touching it.

- [ ] **Step 11: Verify it compiles with nothing unused**

Run: `pnpm --filter web check-types`
Expected: exits 0.

Run: `pnpm exec biome check --write apps/web/src/components/journal/library`
Expected: exits 0. Biome flags unused imports, so this is the gate that catches anything missed above.

- [ ] **Step 12: Verify no stale references remain**

Run: `grep -n "bubbleFormShell\|AudioRecorderField" apps/web/src/components/journal/library/AddJournalEntryPanel.tsx`
Expected: no output.

Run: `grep -n "imageUpload" apps/web/src/components/journal/library/AddJournalEntryPanel.tsx`
Expected: hits only on `writingImageUpload`. There must be no bare `imageUpload` identifier left.

- [ ] **Step 13: Manual check across all three breakpoints**

Run `pnpm run dev:web` and open the add-entry panel from the Library. In devtools device mode, check at **375px**, **768px**, and **1440px**.

**Video tab** — three tabs with Video filled red; panel wash pink; a single centered column never wider than 680px; order reads Cover Image, Title, Date, Your Video, PDF Export. The cover box is dashed red with `Attach a video thumbnail of your choice`, a red `Add Image`, an `OR` rule, and an outlined `Choose From Gallery`. Dragging an image file over the box turns its border solid and deepens the wash; dropping it shows the preview with an `Edit Thumbnail` pill. Dropping a `.txt` file shows `Choose an image file for the cover.` and leaves any existing preview alone. Creating an entry with no cover still falls back to the video's first frame in the library.

**Recording tab** — tabs amber; wash cream; order reads Cover Image, Title, Date, Your Recording. The capture card shows a mic icon, `Capture Your Memory`, `Record Audio`, `OR`, `Choose From Files`. `Record Audio` starts recording immediately — the waveform replaces the card and the timer ticks. Deleting the clip returns to the card. `Choose From Files` with an audio file swaps straight to the waveform with playback working. There is no PDF Export card.

**Writing tab** — teal, mint wash, layout unchanged except that it now sits in the 680px column and has no journal select.

At 375px the tab labels shrink but stay on one row with icons visible, and the page never scrolls sideways.

- [ ] **Step 14: Commit**

```bash
git add apps/web/src/components/journal/library/AddJournalEntryPanel.tsx
git commit -m "feat(web): redesign create-entry panel layout to match mobile design"
```

---

### Task 8: Convert the panel to react-hook-form + Zod

**Files:**
- Create: `apps/web/src/lib/journal/schemas.ts`
- Modify: `apps/web/src/components/journal/library/AddJournalEntryPanel.tsx`

**Why:** `.claude/rules/forms-zod-react-hook-form.md` requires react-hook-form + Zod for forms in `apps/web` and forbids raw `useState` per field. The panel currently holds every field in its own `useState`. This runs AFTER the layout work so the visual change and the state refactor stay separately reviewable.

`react-hook-form` (^7.77.0), `@hookform/resolvers` (^5.2.2), and `zod` (catalog) are already dependencies of `apps/web`. Add nothing.

**Interfaces:**
- Consumes: the finished panel from Task 7.
- Produces: `entryFormSchema` and `EntryFormValues` from `@/lib/journal/schemas`.

**Convention reference:** follow `apps/web/src/lib/auth/schemas.ts` (one `z.object` per form, `export type X = z.infer<typeof schema>`) and `apps/web/src/components/auth/sign-in-form.tsx` (`useForm` + `zodResolver`, `Controller` for non-native inputs).

- [ ] **Step 1: Write the schema**

Create `apps/web/src/lib/journal/schemas.ts` with exactly this content:

```ts
import { z } from "zod";

/**
 * One schema for all three media. `mode` decides which media field is
 * required, mirroring the panel's tabs.
 */
export const entryFormSchema = z
	.object({
		mode: z.enum(["writing", "recording", "video"]),
		title: z.string().trim().min(1, "Give your journal a title."),
		date: z.date({ message: "Choose a date for this entry." }),
		body: z.string(),
		audioFile: z.instanceof(File).nullable(),
		videoFile: z.instanceof(File).nullable(),
		imageFile: z.instanceof(File).nullable(),
	})
	.superRefine((values, ctx) => {
		if (values.mode === "writing" && values.body.trim().length === 0) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["body"],
				message: "Write something before creating your entry.",
			});
		}
		if (values.mode === "recording" && values.audioFile === null) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["audioFile"],
				message: "Record audio before creating your entry.",
			});
		}
		if (values.mode === "video" && values.videoFile === null) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["videoFile"],
				message: "Choose a video before creating your entry.",
			});
		}
	});

export type EntryFormValues = z.infer<typeof entryFormSchema>;
```

The audio and video messages are copied verbatim from the strings the panel shows today, so user-visible behaviour does not change.

- [ ] **Step 2: Replace the field state with useForm**

In `AddJournalEntryPanel.tsx`, delete these `useState` declarations: `mode`, `title`, `date`, `body`, `imageFile`, `audioFile`, `videoFile`, and `showErrors`.

Keep `mounted`, `visible`, `submitting`, `uploadProgress`, `error`, and `imagePreview` — those are not form fields.

Add in their place:

```tsx
	const form = useForm<EntryFormValues>({
		resolver: zodResolver(entryFormSchema),
		mode: "onSubmit",
		defaultValues: {
			mode: "writing",
			title: "",
			date: undefined,
			body: "",
			audioFile: null,
			videoFile: null,
			imageFile: null,
		},
	});

	const mode = form.watch("mode");
	const errors = form.formState.errors;
```

Add these imports:

```tsx
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { type EntryFormValues, entryFormSchema } from "@/lib/journal/schemas";
```

The `EntryModeTabs` call becomes:

```tsx
						<EntryModeTabs
							value={mode}
							onChange={(next) => form.setValue("mode", next)}
						/>
```

- [ ] **Step 3: Delete the hand-rolled validity flags**

Remove `titleInvalid`, `dateInvalid`, `bodyInvalid`, `audioInvalid`, `videoInvalid`, and `isValid` entirely.

Every `showErrors && xInvalid` expression becomes `Boolean(errors.x)`.

Delete the three catch-all error paragraphs — the ones guarded by `showErrors && videoInvalid`, `showErrors && audioInvalid`, and `showErrors && !isValid`. Per-field messages replace them. Render each field's message directly beneath its control:

```tsx
							{errors.videoFile ? (
								<p className={entryErrorTextClass} role="alert">
									{errors.videoFile.message}
								</p>
							) : null}
```

Import `entryErrorTextClass` from `@/components/journal/library/entryFormStyles` if it is not already imported.

- [ ] **Step 4: Bind the inputs**

`Title` uses `register`:

```tsx
								<Input
									id={`${formId}-title`}
									{...form.register("title")}
									placeholder="Give your journal a title"
									className={entryInputClass(Boolean(errors.title))}
									aria-invalid={Boolean(errors.title)}
								/>
```

`Date` uses `Controller`, because `DateField` is not a native input:

```tsx
							<Controller
								control={form.control}
								name="date"
								render={({ field }) => (
									<DateField
										value={field.value}
										onChange={field.onChange}
										invalid={Boolean(errors.date)}
										popoverClassName="z-[1600]"
									/>
								)}
							/>
```

`videoFile` wraps `EntryVideoUpload` the same way:

```tsx
									<Controller
										control={form.control}
										name="videoFile"
										render={({ field }) => (
											<EntryVideoUpload
												accentColor={accent}
												value={field.value}
												onChange={field.onChange}
												invalid={Boolean(errors.videoFile)}
											/>
										)}
									/>
```

`audioFile` wraps `AudioCaptureCard` identically, swapping the component, the `name`, and the error key.

`body` uses `register`, since `Textarea` is a native element:

```tsx
									<Textarea
										id={`${formId}-body`}
										{...form.register("body")}
										className={bubbleTextareaClass(Boolean(errors.body))}
										aria-invalid={Boolean(errors.body)}
									/>
```

The cover image is written through `form.setValue`, because `handleImageFile` already owns compression and the preview URL. At the end of `handleImageFile`, replace `setImageFile(file)` with:

```tsx
		form.setValue("imageFile", file);
```

- [ ] **Step 5: Move submission onto handleSubmit**

`handleCreate` now receives validated values instead of reading state. The resolver has already guaranteed the title, date, and media, so its old guard goes away:

```tsx
	const handleCreate = async (values: EntryFormValues) => {
		if (!journalId) return;

		setSubmitting(true);
		setUploadProgress(null);
		setError(null);
```

Inside the body, read `values.imageFile`, `values.videoFile`, `values.audioFile`, `values.mode`, `values.title`, `values.date`, and `values.body` in place of the old state variables. The `createEntry` call keeps exactly the same shape:

```tsx
			await createEntry({
				journalId,
				title: values.title.trim(),
				dateMs: values.date.getTime(),
				mode: values.mode,
				body: values.mode === "writing" ? values.body.trim() : undefined,
				imageId,
				audioId,
				videoId,
			});
```

Change the form element to submit through RHF:

```tsx
					<form
						id={formId}
						className={entryColumnClass}
						onSubmit={form.handleSubmit(handleCreate)}
					>
```

The submit button's `disabled` becomes `disabled={submitting}`. Drop the `|| !isValid` term — RHF blocks invalid submits and surfaces the reasons, so the button no longer starts out dead with no explanation.

`handleDownload` also reads state today. Change it to read `form.getValues()` at call time:

```tsx
	const handleDownload = () => {
		const { mode: current, body, title, audioFile } = form.getValues();
		if (current === "writing" && body.trim()) {
```

with the rest of its body unchanged.

- [ ] **Step 6: Point resetForm at the form**

Replace the per-field setters inside `resetForm` with a single reset:

```tsx
		form.reset({
			mode: "writing",
			title: "",
			date: undefined,
			body: "",
			audioFile: null,
			videoFile: null,
			imageFile: null,
		});
```

Keep the existing `imagePreview` blob-URL revocation exactly as it is — that is not form state and still needs manual cleanup:

```tsx
		setImagePreview((prev) => {
			if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
			return null;
		});
```

Add `form` to the `useCallback` dependency array for `resetForm`.

- [ ] **Step 7: Verify no raw field state remains**

Run: `grep -n "showErrors\|titleInvalid\|dateInvalid\|bodyInvalid\|audioInvalid\|videoInvalid\|isValid" apps/web/src/components/journal/library/AddJournalEntryPanel.tsx`
Expected: no output.

Run: `grep -n "useState" apps/web/src/components/journal/library/AddJournalEntryPanel.tsx`
Expected: hits only for `mounted`, `visible`, `submitting`, `uploadProgress`, `error`, and `imagePreview`. Any other `useState` means a form field was missed.

- [ ] **Step 8: Verify it compiles**

Run: `pnpm --filter web check-types`
Expected: exits 0.

Run: `pnpm exec biome check --write apps/web/src/components/journal/library apps/web/src/lib/journal`
Expected: exits 0.

- [ ] **Step 9: Manual check**

Run `pnpm run dev:web` and open the add-entry panel.

Expected on each of the three tabs: pressing Create with an empty form shows a message under Title, under Date, and under that tab's media control — rather than one catch-all line at the bottom. Filling everything in creates the entry exactly as before, with the same upload progress text. Switching tabs preserves whatever Title and Date were already typed. The Create button is clickable from first paint instead of starting disabled.

- [ ] **Step 10: Commit**

```bash
git add apps/web/src/lib/journal/schemas.ts apps/web/src/components/journal/library/AddJournalEntryPanel.tsx
git commit -m "refactor(web): move entry form onto react-hook-form and zod"
```

---

## Done criteria

- `pnpm --filter web check-types` exits 0.
- `pnpm exec biome check --write apps/web/src/components/journal/library` exits 0.
- `git status --short -- apps/native apps/admin packages` is empty.
- `git status --short -- apps/web/src/components/journal/library/EditJournalEntrySidebarForm.tsx apps/web/src/components/journal/library/EntryImageUpload.tsx apps/web/src/components/journal/library/libraryFormStyles.ts` is empty.
- All three tabs create entries successfully at 375px, 768px, and 1440px.
- Nothing has been pushed to any remote.
