# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Read the imported rule files below before making any changes to the codebase.** They mirror the cursor rules in `.cursor/rules/` so both editors stay in sync.

If you edit one of the rules below, update the matching `.cursor/rules/*.mdc` file too.

## Commands

```bash
# Install dependencies (always pnpm, never npm/yarn)
pnpm install

# Start everything (single Turbo TUI; Ctrl+C stops all)
pnpm run dev

# Start services individually
pnpm run dev:server   # Convex backend
pnpm run dev:web      # Web app (Vite, port 5173)
pnpm run dev:admin    # Admin app
pnpm run dev:native   # Expo (port 8081)

# Build
pnpm run build

# Type-check all packages
pnpm run check-types

# Type-check a single app (also regenerates TanStack route tree)
pnpm --filter web check-types
pnpm --filter admin check-types

# Lint + format (Biome)
pnpm run check

# Add a shadcn component (always use -c apps/web, never -c packages/ui)
pnpm dlx shadcn@latest add <component> --yes -c apps/web
```

## Repo layout

- `apps/web` — Vite + React + TanStack Router web client. Auth via Clerk, data via Convex.
- `apps/native` — React Native app (Expo, Uniwind styling, HeroUI Native primitives).
- `apps/admin` — Admin dashboard (shares `packages/ui` tokens with web).
- `packages/ui` — Shared shadcn components, design tokens (`src/styles/globals.css`, `src/lib/brand-journal.ts`), shared hooks.
- `packages/backend/convex` — Convex schema, queries, mutations, actions. One folder per domain (`user/`, `journal/`, `stripe/`, `revenuecat/`, `subscriptions/`, `admin/`).
- `packages/env`, `packages/config`, `packages/assets` — Shared env parsing, tsconfig/biome, static assets.

## Architecture

### Web app (`apps/web/src/`)

Feature code is split across three sibling folders:

- `routes/` — File-based TanStack Router pages. Adding a file auto-updates `routeTree.gen.ts`; never hand-edit it.
- `features/` — Domain logic per feature (hooks, Convex wiring, business rules). One subfolder per domain (`journal/`, `billing/`, `account/`, etc.).
- `components/` — UI-only components per domain, composed from `packages/ui` primitives.
- `lib/` — Zod schemas (`lib/<domain>/schemas.ts`), route constants (`lib/routes.ts`), utilities.

Route paths are centralised in `apps/web/src/lib/routes.ts` (`ROUTES.*`). Never hardcode `"/dashboard/..."` strings in components or `<Link>` calls.

### Convex backend (`packages/backend/convex/`)

Grouped by domain, each with separate files per function kind (`queries.ts`, `mutations.ts`, `actions.ts`). Key domains:

- `user/` — Clerk user sync, account management, deletion
- `journal/` — Journal entries, ordering, storage, AI enrichment
- `stripe/` — Checkout, webhooks, customer helpers (web billing)
- `revenuecat/` — Mobile subscription webhooks
- `subscriptions/` — Unified subscription state across Stripe + RevenueCat

HTTP webhooks are registered in `convex/http.ts`. Convex components (rate limiting, workflows, etc.) are registered in `convex/convex.config.ts`.

### Billing

Web billing runs through **Stripe** (embedded checkout via `stripe/embeddedCheckout.ts`). Mobile billing runs through **RevenueCat** (`revenuecat/`). Both write into `subscriptions/` to provide a single source of truth for subscription access checks.

## How to work in this repo

- Use `pnpm` (workspace is pnpm + Turbo). Never `npm` or `yarn`.
- Before claiming a web change is done, run `pnpm --filter web check-types` (also regenerates the TanStack route tree).
- Routes are file-based under `apps/web/src/routes/`. Adding a file there auto-updates `routeTree.gen.ts` on the next build/dev — don't hand-edit the generated tree.
- Centralise route paths in `apps/web/src/lib/routes.ts`; never hardcode `"/dashboard/..."` strings in components.
- Convex schema lives in `packages/backend/convex/schema.ts`. New tables/fields go there first, then the generated types flow into `api.*`. Make new fields `v.optional(...)` if existing rows won't have them.

## Imported rule files

Read these before editing the matching areas of the codebase. The header in each file lists the globs it applies to.

- @.claude/rules/ui-styling.md — shadcn, theme tokens, micro-interactions (applies to all `.tsx` / `.ts` / `.css`).
- @.claude/rules/ux-patterns.md — required UX checklist for every screen / feature in `apps/**`.
- @.claude/rules/convex.md — folder structure, `ConvexError`, internal-vs-public functions for `packages/backend/convex/**`.
- @.claude/rules/forms-zod-react-hook-form.md — required stack and conventions for forms in `apps/web`.
- @.claude/rules/native-uniwind-styling.md — Uniwind styling rules for `apps/native/**`.

## House style (universal)

- TypeScript strict everywhere; no `any` unless justified inline with a comment.
- Tabs for indentation (matches existing files and biome config).
- Imports: package imports first, then `@legacy-building/*` workspace imports, then `@/` aliases, then relative. Biome handles ordering on save.
- Prefer named exports. Default exports only for route files / framework-required entry points.
- Don't create `*.md` documentation files unless the user asks. Don't add emojis to source files unless asked.
- Don't delete or fork generated files (`routeTree.gen.ts`, `_generated/`); regenerate them via the proper tool instead.
