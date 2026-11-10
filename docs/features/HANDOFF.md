# Handoff: Legacy Building new features (as of 2026-11-10)

Read this first in a new session, then `graphify-out/CODEMAP.md` for the code map.

## Ground rules from the user
- **Never commit or push without an explicit "commit"/"push" from the user.** Approval for one commit doesn't carry over.
- **Never touch production**: Convex prod `third-quail-997`, Clerk live, Stripe live mode, Vercel production deployments (from `main`), RevenueCat (shared with prod; its webhook hits prod Convex). No `npx convex deploy`, no `vercel --prod`.
- Test only in the sandbox: Convex **dev** `exuberant-lark-860`, Clerk **dev** `light-tetra-72` (pk_test), Stripe **test mode**, Vercel **Preview** builds. Other APIs (RevenueCat, Peecho, DocuGenerate) stay out of the test flow. Resend: keep it or leave it out of the test flow? **Not decided** (it sends the gift email; one key for dev and prod).
- Follow CLAUDE.md and `.claude/rules/*` (pnpm only, ROUTES constants, RHF+Zod forms, ConvexError, Uniwind on native, etc.).
- The user found the earlier staging guide vague. Do setup **live, one step at a time, verifying each result**, not as a long document. Don't assume anything is logged in in the terminal.

## The two features
| Order | Feature | Spec | Status |
|---|---|---|---|
| 1 | Gift Lifetime Access (paid) | [gift-lifetime-access.md](gift-lifetime-access.md), PM tasks + remaining-work checklist in [gift-tasks.md](gift-tasks.md) | **Code complete (uncommitted)**, not yet tested on the cloud |
| 2 | Journal Sharing / "Our Story" | [journal-sharing.md](journal-sharing.md) | Requirements agreed, **not started** |
| – | SST-10 native Library background | gift-tasks.md#sst-10 | Done (uncommitted) |

Design source: Figma copy owned by the user, file key `gH6VhLnUJM0vM1npzNvpOe` (pages: `0:1` Mobile Native Views, `109:721` Webapp Views). The Figma MCP connector works on this copy. The page is too big for `get_metadata`, so screenshot at `maxDimension: 16384` and crop locally. Crops are saved in `docs/features/<feature>/`.

## What was done
1. **Code map**: graphify graph + hand-written `graphify-out/CODEMAP.md` (refreshed 2026-11-09 to include gifts). Query with `C:\Python314\python.exe -m graphify query "..." --budget 2000`.
2. **Requirements**: Figma reviewed, ambiguities resolved with the user, PM tasks SST-1..10 recorded, conflicts C1–C7 resolved (see the gift spec).
3. **Gifting implementation** (all uncommitted; file-by-file list in the gift spec, "Implementation (as built)"):
   - Backend `packages/backend/convex/gifts/*` + schema (`gifts` table, `users.lifetimeAccess`), Stripe webhook events, RevenueCat gift routing, lifetime access in `stripe/access.ts` and `getEntitlement`.
   - Web: gift offer/details/checkout/success pages, public redeem `/gift/$token` (sign-up with locked email, Claim My Gift, store-subscription splash), header gift icon, Account "Gift & Invite" history, recipient quiz heading.
   - Native: gift icon on Desk/Library, Account row, `app/gift/index.tsx` + `app/gift/details.tsx` (RevenueCat `lifetime_gift` purchase + server verification), lifetime store notice.
   - Placeholder gift card PNG (QR only) until the client's template arrives.
4. **Verification done**: backend `tsc` clean; `vitest` 120/120 (10 new gift tests); `pnpm --filter web check-types` clean; native `tsc` clean; Biome lint clean on changed files. The redeem page was rendered in a browser against a throwaway local Convex backend (desktop + 375 px), with a seeded demo gift.
   **Not verified**: anything on the real dev Convex / Stripe / Vercel, the real email, the native app on a device.
5. **Repo cleanup** (staged deletions, uncommitted): removed `.vscode/` (README updated), `dummy.txt`, `mob.png`, `weblb.png`.
6. **Memory files** for future sessions: no-commit rule, upcoming features, staging setup, codemap location.

## 2026-11-10 update (code complete for gifting)
- The client's assets (from the `temporary/` folder, now deleted) are in place: gift card template → `packages/backend/convex/gifts/cardTemplate.ts` (embedded 1200×1800 JPEG); hero → `packages/assets/images/gift-hero.jpg`; redeem hero (top of the card) → `gift-redeem-hero.jpg`; Library background → `apps/native/assets/images/LibraryBackground.png`.
- Real gift card rendered by `gifts/giftCard.ts` with `@resvg/resvg-js` (added to `packages/backend` and to `convex.json` `node.externalPackages`) and Nunito from `@legacy-building/pdf/fonts/*` (new subpath exports). Checked: rendered inside a throwaway local Convex backend, PNG 1200×1800.
- Also added: resend gift email (web + native history), account-deletion scrub for gifts, admin Gifts page (SST-9) + "Lifetime" badges, paywall "Give the Gift of a Legacy" card (web dialog + billing page, native paywall), Library background behind the native list (per-card ShelfLedge removed).
- Checks: backend tsc + 124/124 tests, web check-types, native tsc, admin tsc (only the 2 old errors), Biome lint clean on changed files. Screens not checked in a running app yet.

## Current local state
- Uncommitted changes on `main` (working tree). Nothing pushed. No branch created yet. Planned branch: `feature/gift-lifetime-access` → PR into `staging` (repo Actions only allow `feature|bugfix|hotfix|release/*` → `staging`, and `staging` → `main`).
- Git-ignored env files written by Claude:
  - `apps/web/.env.local`: `VITE_CONVEX_URL=https://exuberant-lark-860.convex.cloud`, dev Clerk pk.
  - `apps/native/.env.local`: dev Convex + dev Clerk; `EXPO_PUBLIC_WEB_APP_URL=http://192.168.1.136:3001`; **RevenueCat keys intentionally absent**.
  - `packages/backend/.env.local`: **absent** (the dev deployment isn't configured locally yet).
- `pnpm install` was run. Nothing has been deployed anywhere. The local throwaway Convex backend and the generated `apps/native/android/` were removed.
- `convex/_generated/api.d.ts` was regenerated by the Convex CLI (adds the `gifts/*` modules). The other generated files differ only in line endings.

## Known problems / gotchas
- **Vercel blocks builds for commits authored by non-team members.** The user isn't on the Vercel team and can't use the admin's GitHub in the CLI (2FA app unavailable). They're a GitHub collaborator with their own account. Plan: push the feature branch as themselves → PR into `staging` → merge it from an **existing admin GitHub browser session** (merge or squash, not rebase), so the merge commit is the admin's and Vercel builds the Preview. Fallback (unverified): a Vercel CLI preview deploy with an admin Vercel token, never `--prod`.
- **Expo Go**: the project is on Expo **SDK 56**; the store Expo Go only runs SDK 57. Install the SDK 56 Expo Go APK from expo.dev/go on the phone, then `npx expo start --go` in `apps/native`. Not yet verified that every native module loads in Expo Go (watch `react-native-keyboard-controller`, `react-native-purchases`). Don't go down the local Gradle build path (JDK 25/Gradle 9 incompatibilities; the user rejected it).
- **Mobile gift payment in the sandbox is impossible as built**: it uses store IAP via RevenueCat, which is off. Open question to the user: add a sandbox-only switch (env flag) so native "Send Gift" opens the Stripe **test** checkout on web?
- The dev Convex env needs `WEB_APP_URL` = the staging web Preview URL (for QR/links). The Stripe test webhook endpoint `https://exuberant-lark-860.convex.site/stripe/webhook` needs the 4 new events. Turn on Adaptive Pricing in test mode, or make it switchable if Stripe rejects it.
- `npx convex dev` on this machine: `~/.convex` exists, but don't assume a login. Preferred: a **development deploy key** from the dashboard in `packages/backend/.env.local` (`CONVEX_DEPLOY_KEY=dev:exuberant-lark-860|…`), then `npx convex dev --once`; confirm it names `exuberant-lark-860`.
- Biome reports formatting errors on every file in this checkout because `core.autocrlf=true` makes CRLF; ignore (git normalises on commit). Lint with `biome lint`.
- `apps/admin` has 2 pre-existing type errors (`admin-filter-select.tsx`, `user-detail-dialog.tsx`), unrelated.
- `packages/backend/backup.zip` is a committed Convex data export (contains Stripe component tables). Ask the user whether to remove it.
- `packages/backend` gained the dependency `@resvg/resvg-js@2.6.2` (lockfile updated). On the first push, Convex installs it on its servers (external package).
- Expo doctor: 17 packages are patch versions behind SDK 56, and there are duplicate `expo-constants` / `react` versions. Not changed.

## Next steps (in order, live with the user)
1. Phone: install the SDK 56 Expo Go → start Metro (`npx expo start --go`) → user scans → fix whatever breaks.
2. Decided: mobile payments later (the phone only needs to show screens). Keep Resend? Still open, but it's needed for the gift email in the web flow.
3. Convex dev: user generates a dev deploy key → put it in `packages/backend/.env.local` → `npx convex dev --once` → confirm deployment `exuberant-lark-860` → set `WEB_APP_URL`.
4. On the user's explicit "commit": branch `feature/gift-lifetime-access`, commit (exclude `.env.local`, `graphify-out/`, `.claude/skills/`; decide on `docs/features`), push as the user's GitHub account (`gh auth status` first), open the PR into `staging`.
5. Vercel (admin browser session, step by step): Preview-only env vars `VITE_CONVEX_URL` + `VITE_CLERK_PUBLISHABLE_KEY` (dev values) in both projects; check deployment protection; merge the PR from the admin GitHub session; note the Preview URLs.
6. Stripe test mode: add the 4 webhook events, Adaptive Pricing.
7. Run the full test flow (gift spec / gift-tasks.md checklist).
8. Then Journal Sharing (spec agreed, not started).
