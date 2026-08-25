# Web Create-Entry Form Redesign

Date: 2026-08-25
Scope: `apps/web` only. Native and admin are untouched.

## Goal

Rebuild the create-journal-entry panel in the web app to match the supplied
mobile mockup: a three-tab mode switcher, a dashed cover-image drop zone, an
accent-tinted media capture card, and a bordered PDF Export note, laid out as a
single centered column at every screen size.

## Non-goals

- The edit-entry sidebar (`EditJournalEntrySidebarForm.tsx`).
- The journal create/edit dialogs (`CreateJournalDialog.tsx`,
  `EditJournalDialog.tsx`, `JournalCoverImageUpload.tsx`).
- The native app.
- Any change to validation rules, upload logic, or the `createEntry` mutation.

## Approach

Add new style helpers and new components alongside the existing ones rather
than adding variants to the shared ones. `AddJournalEntryPanel` switches to the
new components; every other consumer keeps importing the old ones and is
provably unaffected. The duplication is deliberate: it is the cost of not
touching four out-of-scope forms.

## Decisions

| Question | Decision |
| --- | --- |
| Tab structure | Three tabs (Writing / Recording / Video). The `Journal type` select is deleted. |
| Desktop layout | Single centered column capped at 680px at every breakpoint. |
| `Select a journal` | Removed. |
| Header | Keep the existing chevron-down close button. No sticky Cancel/Create bar. |
| `Download` button | Kept, at the bottom beside `Create`. |
| Writing tab | Existing layout and components retained. |
| Audio capture | New amber capture card for the empty state; existing waveform once a clip exists. |
| Cover image | Full mockup treatment plus drag-and-drop. |
| PDF Export card | Video tab only. See below. |
| Audio file size cap | 50 MB for files picked via `Choose From Files`. |

### Why the PDF Export card stays on Video only

The mockup shows the PDF Export block on the amber Recording screen as well as
the red Video one, but that screen is a recolour of the video screen: it also
shows a video-camera icon and a `Record Video` button. The copy itself is
video-specific (`Videos cannot be embedded in the PDF`), and audio entries do
embed a player link rather than a QR code today. The card therefore renders on
the Video tab only, matching current behaviour. If audio should carry an
equivalent note, it needs its own copy and is out of scope here.

### Why removing `Select a journal` is safe

Every entry point sets a concrete journal before opening the panel:

- `features/journal/DashboardDeskPage.tsx:52`
- `features/journal/DashboardLibraryPage.tsx:56` (router state, via
  `RecentJournalCard`)
- `features/journal/DashboardLibraryPage.tsx:114`

`AddJournalEntryPanel` already early-returns `null` when `journalId` is absent,
so the select can never rescue a missing journal today. After the change,
`selectedJournalId` is always the `journalId` prop.

## Components

### New: `entryFormStyles.ts`

Style helpers for the redesigned panel. Sits beside `libraryFormStyles.ts`,
which stays as-is for the out-of-scope forms. Holds the 680px column shell, the
field label/input classes, the dashed drop-zone classes, the capture-card
classes, and the info-card classes.

### New: `EntryCoverDropzone.tsx`

Full-width cover image control.

- Empty: 2px dashed border in the mode accent, wash of the accent at 8%
  opacity, helper copy (`Attach a video thumbnail of your choice` for video,
  `Attach an image of your choice` otherwise), a filled `Add Image` button, an
  `OR` rule, an outlined `Choose From Gallery` button, and the caption
  `The image will be used as the cover of your journal entry.` beneath the box.
- Drag-over: border and wash deepen. Dropping an image file selects it.
- Filled: preview at `aspect-[16/10] object-cover`, a white `Edit Thumbnail`
  pill at the top right, same caption beneath.

Both buttons open the same file picker; on desktop there is no separate camera
source. Files pass through the existing `compressImageFile` helper.

### New: `AudioCaptureCard.tsx`

Wraps `AudioRecorderField` without changing its internals.

- Empty: the capture card in amber with a mic icon, heading
  `Capture Your Memory`, copy
  `Record a new audio clip or choose one from your files.`, a filled
  `Record Audio` button, an `OR` rule, and an outlined `Choose From Files`
  button backed by an `audio/*` file input.
- Non-empty: the existing waveform row renders in place of the card.

`Record Audio` starts the existing recorder. Picked files are capped at 50 MB
and rejected with an inline message above the card if oversized. Recorded clips
keep their current uncapped behaviour, since the recorder produces its own
bounded output.

### Changed: `EntryModeTabs.tsx`

Two tabs become three: `Writing` (pen icon, `#008080`), `Recording` (mic icon,
`#e9a746`), `Video` (camcorder icon, `#e05150`). The active tab is filled with
its accent and white text; inactive tabs show accent-colored text on white. The
`accent` prop is dropped, since each tab now owns a fixed color.

### Changed: `AddJournalEntryPanel.tsx`

- Delete `journalTypeSelect`, `recordingSelectRow`, and `journalSelect`.
  `selectedJournalId` collapses to the `journalId` prop, so `journalInvalid`
  and the journal `useQuery` calls (`listByType`, `getById`) go with them.
- Swap the form shell from `max-w-[1200px]` to the centered 680px column.
- Unstack the `Title` / `Date` `sm:grid-cols-2` row into two full-width fields.
- Field order becomes: Cover Image, Title, Date, capture card, and then the
  PDF Export card on the Video tab only.
- Replace `EntryImageUpload` with `EntryCoverDropzone` in the Recording and
  Video branches.
- Replace the bare `AudioRecorderField` with `AudioCaptureCard`.
- Replace the grey PDF paragraph with the bordered info card: a circled QR icon
  on the left, an `PDF Export` heading, and the existing copy beneath.
- Leave the Writing branch's components and order alone.

### Unchanged

`EntryVideoUpload.tsx` already renders the mockup's capture card. Only its
surrounding label changes. `AudioRecorderField.tsx`, `DateField.tsx`,
`CameraRecorderDialog.tsx`, `compressImageFile`, `uploadToStorage`,
`extractVideoFirstFrame`, and the `createEntry` call are untouched.

## Responsive behaviour

One column at every width.

- `>= 720px`: the 680px column is centered in the panel with the surplus as
  gutters.
- `< 720px`: the column is full-bleed with 16px side padding.
- The tab bar stays a single row; below ~400px the tab labels shrink to
  `text-xs` and icons stay visible rather than wrapping to two rows.
- The cover preview and capture card are always full width of the column.

## Known inconsistency

The Writing tab keeps its current components while Recording and Video get the
new ones, so Writing still shows the 265x200 camera tile where the others show
the dashed drop zone, and its `Title` / `Date` row keeps the two-column grid.
This was chosen deliberately. Writing does still change in two ways it cannot
avoid: its `Select a journal` field is removed along with the others, and it
renders inside the 680px column rather than the 1200px one.

## Error handling

Unchanged in substance. Validation still runs on submit via `showErrors`, and
invalid fields take the `#b0200c` border. Two additions:

- An unsupported file dropped on the cover zone shows an inline message beneath
  the caption and does not change the selection.
- An audio file over 50 MB picked via `Choose From Files` shows an inline
  message above the capture card and does not change the selection.

## Verification

- `pnpm --filter web check-types` passes.
- `pnpm run check` (Biome) passes.
- Manual pass in `pnpm run dev:web` for each of the three tabs at 375px, 768px,
  and 1440px: create an entry, confirm the accent wash follows the tab, the
  cover drop zone accepts both a click and a drop, the audio card swaps to the
  waveform after recording and after picking a file, and the video tab still
  falls back to the first frame when no cover is chosen.
