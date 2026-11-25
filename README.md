# Legacy Building

Monorepo for the Legacy Building product: web app, admin app, mobile app, and shared backend.

Built with React, TanStack Router, React Native, Expo, Convex, Clerk, TailwindCSS, shadcn/ui, Biome, and Turborepo.

## Project Structure

```text
legacy-building/
├── apps/
│   ├── admin/       # Admin app (React + Vite + TanStack Router)
│   ├── native/      # Mobile app (React Native + Expo)
│   └── web/         # Web app (React + Vite + TanStack Router)
├── packages/
│   ├── backend/     # Convex backend functions and schema
│   ├── config/      # Shared TypeScript config
│   ├── env/         # Shared environment parsing
│   └── ui/          # Shared shadcn/ui components and styles
```

## Prerequisites

- Node.js
- pnpm `10.28.0`
- A Convex account/project
- A Clerk application
- For the mobile app (`apps/native`): an [Expo](https://expo.dev) account in the **sliding-scale** org (for EAS builds), and optionally [Android Studio](https://developer.android.com/studio) for local Android builds — see [Mobile app setup](#mobile-app-setup)

## Setup

Install dependencies from the project root:

```bash
pnpm install
```

Set up Convex:

```bash
pnpm run dev:setup
```

Follow the Convex prompts to create or connect a development deployment. This creates `packages/backend/.env.local`.

Create the app environment files:

- `apps/web/.env`
- `apps/admin/.env`
- `apps/native/.env`
- `packages/backend/.env.local`

Use these variables:

```bash
# apps/web/.env
# apps/admin/.env
VITE_CONVEX_URL=
VITE_CLERK_PUBLISHABLE_KEY=

# apps/native/.env
EXPO_PUBLIC_CONVEX_URL=
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=

# packages/backend/.env.local
CONVEX_DEPLOYMENT=
CONVEX_URL=
CONVEX_SITE_URL=
```

For Clerk authentication, follow the [Convex + Clerk guide](https://docs.convex.dev/auth/clerk), then set `CLERK_JWT_ISSUER_DOMAIN` in the Convex dashboard.

## Start The Project

Start everything with Turborepo (single Turbo TUI; Ctrl+C stops all services):

```bash
pnpm run dev
```

Or start one app/service at a time:

```bash
pnpm run dev:server
pnpm run dev:web
pnpm run dev:admin
pnpm run dev:native
```

The web and admin apps run through Vite. Open the local URL shown in the terminal, usually [http://localhost:5173](http://localhost:5173).

The native app uses Expo Metro. See [Mobile app setup](#mobile-app-setup) for how to run it on a device, emulator, or in the browser.

## Mobile app setup

The mobile app lives in `apps/native`. It uses a **development build** (custom dev client), not Expo Go, because the stack includes native modules (Clerk, keyboard controller, HeroUI Native, and others).

| Target                                 | What it is                                                | Good for                                                         |
| -------------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------- |
| **Development build**                  | Your own app binary + Metro (`pnpm dev` in `apps/native`) | Real Android/iOS behavior, auth, daily mobile work               |
| **Expo web** (`http://localhost:8081`) | Same mobile code in the browser via Metro                 | UI and routing without installing anything                       |
| **Expo Go**                            | Generic store app                                         | Not recommended for this repo — SDK/native mismatches are common |

`apps/web` (Vite, usually port **5173**) is the **marketing/product website**. `apps/native` on port **8081** is the **mobile app preview in the browser** — they are different apps.

### Expo / EAS access

The project is linked to the **sliding-scale** Expo organization (`owner` in `apps/native/app.json`). Before cloud builds:

1. Get invited to the **sliding-scale** org on [expo.dev](https://expo.dev).
2. Log in with EAS CLI (package name is `eas-cli`, not `eas`):

```bash
cd apps/native
pnpm dlx eas-cli@latest login
pnpm dlx eas-cli@latest whoami
```

If `eas build` fails with **Entity not authorized**, you are on the wrong Expo account or not yet added to the org. Ask a teammate with Owner access to invite you, or run `eas init` only when creating a new project under the org (do not change `projectId` without team agreement).

### Environment

Create `apps/native/.env` (loaded by `apps/native/metro.config.js`):

```bash
EXPO_PUBLIC_CONVEX_URL=
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=
```

Start Convex when testing auth or data:

```bash
pnpm run dev:server
```

### Path A — No Android Studio (recommended minimum)

Use this if you only need mobile UI in the browser, or you want a real Android app without installing the Android SDK locally.

#### 1. Preview in the browser

From the repo root:

```bash
pnpm run dev:native
```

Press **`w`** in the Expo terminal, or from `apps/native`:

```bash
pnpm web
```

Open [http://localhost:8081](http://localhost:8081). This is the fastest way to work on screens; it does not replace testing on a physical device.

#### 2. Install a development build on your phone (EAS)

From `apps/native`, after `eas-cli` login and org access:

```bash
pnpm dlx eas-cli@latest build --profile development --platform android
```

When the build finishes, install the APK from the link EAS provides (enable “install unknown apps” on Android if prompted).

#### 3. Run Metro for the dev client

```bash
cd apps/native
pnpm dev
```

Or from the root: `pnpm run dev:native` (same as `expo start --dev-client`).

On your phone, open the installed **legacy-building** dev app (not Expo Go). Phone and PC must be on the same Wi‑Fi, or use a tunnel:

```bash
pnpm exec expo start --dev-client --clear --tunnel
```

Rebuild the native app with EAS only when native dependencies or `app.json` plugins change — not for every JS edit.

### Path B — With Android Studio (local Android build)

Use this for emulator/USB debugging without waiting for cloud builds.

#### 1. Install Android tooling (one time)

1. Install [Android Studio](https://developer.android.com/studio).
2. In **SDK Manager**, install Android SDK Platform, Build-Tools, and Platform-Tools.
3. Set environment variables (adjust your Windows username if needed):
   - `ANDROID_HOME` = `C:\Users\<You>\AppData\Local\Android\Sdk`
   - Add to `Path`: `%ANDROID_HOME%\platform-tools` (and `%ANDROID_HOME%\emulator` if using an emulator).
4. Open a new terminal and verify: `adb version`.

Optional: create an Android Virtual Device in **Device Manager**, or use a USB device with **USB debugging** enabled.

#### 2. Build and install the dev client (first time)

```bash
cd apps/native
pnpm install
pnpm android
```

This runs `expo run:android` (generates `android/`, compiles native code, installs the app). The first run can take 20+ minutes.

#### 3. Daily development

```bash
# Terminal 1 (if you need Convex)
pnpm run dev:server

# Terminal 2
cd apps/native
pnpm dev
```

Open the **legacy-building** app on the emulator or device. Press **`r`** in the Metro terminal to reload, **`a`** to open Android again.

Rebuild with `pnpm android` when you add native packages, change `app.json` plugins, or upgrade the Expo SDK.

### Native app scripts (`apps/native`)

| Script         | Command                           | Purpose                                        |
| -------------- | --------------------------------- | ---------------------------------------------- |
| `pnpm dev`     | `expo start --dev-client --clear` | Metro for development build (default)          |
| `pnpm dev:go`  | `expo start --clear`              | Expo Go mode — limited; avoid for this project |
| `pnpm web`     | `expo start --web`                | Mobile app in browser (port 8081)              |
| `pnpm android` | `expo run:android`                | Local Android dev client build + install       |
| `pnpm ios`     | `expo run:ios`                    | Local iOS dev client (macOS + Xcode only)      |

### iOS note

Local `pnpm ios` requires macOS with Xcode. Without a Mac, use EAS: `pnpm dlx eas-cli@latest build --profile development --platform ios` and install via the link or TestFlight, per org workflow.

### Troubleshooting (mobile)

| Issue                                        | What to try                                                                           |
| -------------------------------------------- | ------------------------------------------------------------------------------------- |
| `npx eas` → “could not determine executable” | Use `pnpm dlx eas-cli@latest` instead of `npx eas`                                    |
| EAS “Entity not authorized”                  | Wrong Expo user or missing **sliding-scale** org invite; run `eas whoami`             |
| Expo Go blue “Something went wrong”          | Use dev build or web; ensure Expo Go SDK matches project (SDK 56) if you still try Go |
| Dev app can’t load bundle                    | Same Wi‑Fi as PC, allow firewall for Node/8081, or `--tunnel`                         |
| Red screen / env errors                      | Check `apps/native/.env` URLs and keys; ensure `pnpm run dev:server` is running       |

## Available Scripts

- `pnpm run dev`: Start all apps/services in development mode (single Turbo TUI; Ctrl+C stops all)
- `pnpm run dev:server`: Start the Convex backend
- `pnpm run dev:web`: Start the web app
- `pnpm run dev:admin`: Start the admin app
- `pnpm run dev:native`: Start the Expo native app (development client / Metro)
- `pnpm run dev:setup`: Configure the Convex project
- `pnpm run build`: Build all apps/packages
- `pnpm run check-types`: Check TypeScript types across the workspace
- `pnpm run check`: Run Biome formatting and linting
- `pnpm run prepare`: Initialize Husky git hooks

## UI Customization

React web apps in this stack share shadcn/ui primitives through `packages/ui`.

- Change design tokens and global styles in `packages/ui/src/styles/globals.css`
- Update shared primitives in `packages/ui/src/components/*`
- Adjust shadcn aliases or style config in `packages/ui/components.json`, `apps/web/components.json`, and `apps/admin/components.json`

Import shared components like this:

```tsx
import { Button } from '@legacy-building/ui/components/button';
```

### shadcn CLI in this monorepo

Shared UI components live in `packages/ui`, but the shadcn CLI must run from a **Vite app workspace** (`apps/web` or `apps/admin`) because `packages/ui` has no framework config (`vite.config.ts`, etc.).

Run shadcn commands from the **project root** with `-c apps/web`:

```bash
# From project root
pnpm dlx shadcn@latest <command> -c apps/web
```

`apps/web/components.json` routes shared installs to `@legacy-building/ui/components` and theme updates to `packages/ui/src/styles/globals.css`.

### Apply a preset from the root

Use `apply` to switch style, theme, fonts, and reinstall detected UI components. Replace the preset code with yours from [shadcn/create](https://ui.shadcn.com/create).

```bash
# Full preset: theme, fonts, and shared UI components
pnpm dlx shadcn@latest apply --preset b3dRfZdAS0 --yes -c apps/web
```

After a successful apply:

1. Sync `style`, `baseColor`, `iconLibrary`, and related fields from `apps/web/components.json` into `packages/ui/components.json` and `apps/admin/components.json` if they drift.
2. Review the diff in `packages/ui` — custom shared files such as `auth-field-error.tsx` and `password-change-form.tsx` are not shadcn primitives and should be kept.
3. Run `pnpm run check-types` and visually check web/admin auth screens.

**Do not** run `apply` with `-c packages/ui`. The CLI will fail with “We could not detect a supported framework”.

`apply` does not support `--overwrite`. If the CLI skips a file because it looks identical, reinstall it with `add`:

```bash
pnpm dlx shadcn@latest add separator --overwrite --yes -c apps/web
```

Apply only theme and fonts without reinstalling components:

```bash
pnpm dlx shadcn@latest apply --preset b3dRfZdAS0 --only theme,font --yes -c apps/web
```

Inspect a preset before applying:

```bash
pnpm dlx shadcn@latest preset decode b3dRfZdAS0
```

### Add shadcn components from the root

Add new shared primitives to `packages/ui` via `apps/web`:

```bash
pnpm dlx shadcn@latest add accordion dialog popover sheet table --yes -c apps/web
```

Force overwrite an existing shared component:

```bash
pnpm dlx shadcn@latest add button --overwrite --yes -c apps/web
```

## Formatting And Git Hooks

Initialize hooks:

```bash
pnpm run prepare
```

Format and lint:

```bash
pnpm run check
```
