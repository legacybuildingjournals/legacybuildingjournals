# Testing gifting on the cloud (staging) without touching production

Everything below targets **development / test** resources only:

| Piece | We use (staging / local testing) | Production (never touched) |
|---|---|---|
| Git | your branch `feature/gift-lifetime-access` → PR → `staging` | `main` |
| Vercel | **Preview** deployments of `staging` (web + admin projects) | Production deployments (from `main`) |
| Convex | development deployment **`exuberant-lark-860`** (`https://exuberant-lark-860.convex.cloud`, webhooks at `https://exuberant-lark-860.convex.site`) | `third-quail-997` |
| Clerk | development instance `light-tetra-72` (`pk_test_…`) | live instance (`pk_live_…`) |
| Stripe | **Test mode / Sandbox** (`sk_test_…`) | Live mode |
| RevenueCat | **not used** for testing (its project and webhook are shared with production) | – |

Why production stays safe:
- Both Vercel apps build with plain `vite build`; no build step deploys Convex.
- Convex only changes production with `npx convex deploy`. This guide never runs it; we use a **development deploy key**, which can only push to `exuberant-lark-860`.
- Vercel only promotes `main` to production. `staging` always builds as a Preview.
- All `.env.local` files are git-ignored and never pushed.

Nothing below assumes you're logged in to anything in the terminal. Every step that needs an identity starts by checking it.

---

## Part A — Your own GitHub identity in the terminal

You push with **your own** GitHub account (now a collaborator), not the admin's.

**A1. Accept the collaborator invite** (browser, signed in as *you*): open
`https://github.com/legacybuildingjournals/legacybuildingjournals/invitations` and click **Accept invitation**.
Check: the repo page loads for your account and the branch dropdown lists `staging`.

**A2. Check which GitHub account the terminal uses.** In the project folder (`D:\Sliding_Scale_Work\LegacyBuilding\legacybuildingjournals`):

```bash
gh auth status
```

- "You are not logged into any GitHub hosts", or it shows the admin account → log in as yourself:
  ```bash
  gh auth login --hostname github.com --git-protocol https --web
  ```
  It shows a one-time code and opens github.com. Make sure that browser tab is signed in as **you** (not the admin), paste the code and approve.
- Then make git use that login for pushes:
  ```bash
  gh auth setup-git
  ```
- Confirm (must print **your** username):
  ```bash
  gh api user --jq .login
  ```

**A3. Check the commit author** (goes into the commit history and is what Vercel looks at):

```bash
git config user.name
```
```bash
git config user.email
```

If either isn't you, set them for this repo only (use an email that's verified on your GitHub account):

```bash
git config user.name "Your Name"
```
```bash
git config user.email "you@example.com"
```

## Part B — Branch, commit, push, pull request

The repo's GitHub Actions only accept `feature/*`, `bugfix/*`, `hotfix/*` or `release/*` → `staging`, and only `staging` → `main`.
So the work goes on a feature branch, then into `staging` through a PR.

**B1. Branch + commit** (Claude can run this for you once you say "commit"):

```bash
git checkout -b feature/gift-lifetime-access
```
```bash
git add apps/web apps/native apps/admin packages/backend docs/features
```
```bash
git status
```

Check the `git status` list: no `.env.local`, no `graphify-out/`, no `.claude/`. Then:

```bash
git commit -m "feat(gifts): lifetime access gifting (web purchase + redeem, native screens)"
```

**B2. Push:**

```bash
git push -u origin feature/gift-lifetime-access
```

If a browser window asks you to sign in to GitHub, sign in as **you**. Check: the branch shows on GitHub under *Branches*.

**B3. Open the PR into staging:**

```bash
gh pr create --base staging --head feature/gift-lifetime-access --title "Gift lifetime access" --body "Gifting feature for staging testing."
```

Or on github.com: *Pull requests → New → base: `staging`, compare: `feature/gift-lifetime-access`*.
Wait for the "Protect staging branch source" check to go green.
(`staging` is currently behind `main`, so the PR also shows commits already released from `main`. That's expected and harmless.)

## Part C — Getting Vercel to build (you're not on the Vercel team)

Vercel refuses to build a commit whose **author** isn't a member of the Vercel team. Your commits are authored by you, so a push by itself won't deploy.
Two ways around it, neither needing the admin's 2FA code:

**C1. The admin's browser session merges the PR (your colleague's suggestion, recommended).**
On a browser where you're **already signed in to github.com as the admin** (e.g. the session you used to add yourself as a collaborator), open the PR from B3 and merge it with **"Create a merge commit"** or **"Squash and merge"**. Not "Rebase and merge", which keeps you as the author.
The merge commit is authored by the admin, so Vercel builds `staging` as a Preview in **both** projects.
Each later change follows the same loop: push to your feature branch → new PR into `staging` → merge from the admin session.

**C2. If there's no admin GitHub session: deploy a Preview with the Vercel CLI as the admin's Vercel account.**
This uploads your local files and builds on Vercel. No git author check, and it never touches production as long as you **don't** pass `--prod`.
1. In the browser, signed in to vercel.com as the admin: *Account Settings → Tokens → Create*. Scope: the team that owns the two projects. Expiration: 1 day. Copy it.
2. In the terminal (repo root), check you're not logged in to some other Vercel account:
   ```bash
   npx vercel@latest whoami
   ```
   "No existing credentials" is fine. If it shows an account, it's only used when you leave out `--token`.
3. Link the repo to both projects (it asks which team and projects; pick the web and admin projects):
   ```bash
   npx vercel@latest link --repo --token PASTE_TOKEN
   ```
4. Deploy a **Preview** (it asks which project; run it once for web, once for admin):
   ```bash
   npx vercel@latest deploy --token PASTE_TOKEN
   ```
   It prints a `https://….vercel.app` Preview URL. **Never add `--prod`.** Delete the token in Vercel when you're done.

## Part D — Vercel Preview environment variables (browser, signed in as the admin)

Do this in **each** project (web, Root Directory `apps/web`; admin, Root Directory `apps/admin`) **before** the build in Part C:

1. *Settings → General*: confirm **Root Directory** (`apps/web` / `apps/admin`).
2. *Settings → Build and Deployment*: Build Command should be empty (default) or `vite build`. If it contains `convex`, stop and tell Claude.
3. *Settings → Git*: **Production Branch = `main`**. Leave it.
4. *Settings → Environment Variables*: filter by **Preview** and note what's there. Add or edit these, ticking **only "Preview"** (optionally "Specific branch: `staging`"):

   | Key | Value |
   |---|---|
   | `VITE_CONVEX_URL` | `https://exuberant-lark-860.convex.cloud` |
   | `VITE_CLERK_PUBLISHABLE_KEY` | `pk_test_bGlnaHQtdGV0cmEtNzIuY2xlcmsuYWNjb3VudHMuZGV2JA` |

   If an existing variable is shared by Production and Preview, edit it, untick Preview so Production keeps its value, then add a new Preview-only one. Never change the Production values.
   If you see `CONVEX_DEPLOY_KEY` in Preview, tell Claude (it isn't used by these builds).
5. *Settings → Deployment Protection*: if **Vercel Authentication** is on for Previews, anyone not logged in to this Vercel team gets a login wall. That includes you on your phone and the gift recipient. For testing, turn it off for Previews or use a *Shareable Link*.
6. After the build: *Deployments* → the `staging` (or CLI) Preview → **Visit**. Note the URL; the stable branch URL looks like `https://<project>-git-staging-<team>.vercel.app`. You need the **web** one in Part E.

## Part E — Convex: push the backend to the **development** deployment (no CLI login needed)

**E1. Make a development deploy key** (browser, dashboard.convex.dev signed in as the admin):
open the Legacy Building project → in the deployment picker at the top, choose **Development** and check the URL/name is **`exuberant-lark-860`** → *Settings → URL & Deploy Key* → **Generate Development Deploy Key** → copy it. It starts with `dev:exuberant-lark-860|`.
This key can only ever push to that one development deployment.

**E2. Store it locally** (git-ignored). Create or edit `packages/backend/.env.local` so it contains just this line:

```
CONVEX_DEPLOY_KEY=dev:exuberant-lark-860|PASTE_THE_REST
```

Check it's ignored (should print a matching `.gitignore` rule):

```bash
git check-ignore -v packages/backend/.env.local
```

**E3. Push once:**

```bash
cd packages/backend
```
```bash
npx convex dev --once
```

Expected: it names deployment **`exuberant-lark-860`** and ends with "Convex functions ready!".
If it names anything else, stop. If it says the key type isn't supported, use the login route instead: `npx convex login` (approve in the browser signed in to Convex as the admin), then `npx convex dev --once --configure existing` and choose the project → **development** deployment (`exuberant-lark-860`).
What gets pushed is additive only: a new `gifts` table, a new optional `users.lifetimeAccess` field, new functions. Existing data isn't changed.
For later changes: `pnpm run dev:server` from the repo root (same key, same dev deployment). **Never run `npx convex deploy`.**

**E4. Development environment variables** (dashboard → **Development** deployment → *Settings → Environment Variables*):
- **Add** `WEB_APP_URL` = the staging **web** Preview URL from D6, no trailing slash. Gift QR codes and Claim My Gift links point here. For purely local testing you can temporarily use `http://localhost:3001`.
- Leave the existing ones. Gifting uses `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY` and `CLERK_JWT_ISSUER_DOMAIN`, which you already have. `DOCUGENERATE_*` is unused (safe to delete later). `ALLOW_BILLING_RESET=true` is fine on dev.

## Part F — Stripe (Test mode only)

In dashboard.stripe.com make sure the **Test mode / Sandbox** toggle is on. The keys you see must be `pk_test_` / `sk_test_`.

1. *Developers → Webhooks*: find the endpoint `https://exuberant-lark-860.convex.site/stripe/webhook`.
   - If it exists: open it, check its *Signing secret* matches `STRIPE_WEBHOOK_SECRET` on Convex **dev**, then **Add events**: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `charge.refunded`, `charge.dispute.created`. Keep the existing `customer.subscription.*` events.
   - If it doesn't exist: tell Claude before creating one (the signing secret on Convex dev would need updating).
   - Don't touch any **live-mode** endpoint.
2. *Settings → Payments → Adaptive Pricing* (test mode): turn it on. The gift checkout asks for it. If checkout errors about adaptive pricing, tell Claude to make it switchable.
3. Test card `4242 4242 4242 4242`, any future expiry, any CVC.

## Part G — Clerk

Nothing to change. In dashboard.clerk.com check the instance toggle says **Development** and *Configure → JWT templates* has `convex`.
If sign-in on the `*.vercel.app` preview is rejected because of the domain, check the dev instance's *Domains / allowed origins*.

## Part H — Run locally (web + Android) against development

The git-ignored env files are already set:
- `apps/web/.env.local` → Convex dev + Clerk dev.
- `apps/native/.env.local` → Convex dev + Clerk dev; billing/legal links go to the local web app; **RevenueCat keys removed on purpose**, so no store purchases and nothing reaches the production RevenueCat webhook.

**H1. Web:**

```bash
pnpm install
```
```bash
pnpm --filter web dev --host
```

Open `http://localhost:3001`. Your phone reaches it at `http://192.168.1.136:3001` on the same Wi-Fi (allow Node.js through Windows Firewall when asked).

**H2. Android — why not Expo Go:** this project is on Expo SDK 56, the store Expo Go app only runs the newest SDK (57), and the project is set up for a **development build** (`expo-dev-client`). So we build our own debug app once.

1. Build. Claude builds it; it's at `apps/native/android/app/build/outputs/apk/debug/app-debug.apk`. The `android/` folder is generated and git-ignored.
2. **Uninstall the store version of Legacy Building from the test phone first.** The debug app uses the same app id, so Android won't install it over the store version.
3. On the phone: *Settings → About phone →* tap *Build number* 7× → *Developer options → USB debugging* on. Connect by USB and accept the prompt. Check:
   ```bash
   adb devices
   ```
   It must list your phone as `device`.
4. Install:
   ```bash
   adb install -r apps/native/android/app/build/outputs/apk/debug/app-debug.apk
   ```
5. Start the JS server:
   ```bash
   cd apps/native
   ```
   ```bash
   npx expo start --dev-client
   ```
   Open the newly installed **Legacy Building** app on the phone. It finds the server on the same Wi-Fi, or enter `http://192.168.1.136:8081`. If it can't connect, allow port 8081 through Windows Firewall, or keep USB plugged in and run `adb reverse tcp:8081 tcp:8081`.
6. Not connected in local testing: RevenueCat / store purchases (the in-app gift purchase shows "not available in this build"), push notifications to the device (no Firebase config in the debug build), Apple sign-in.

## Part I — Test run

1. Open the staging **web** Preview (or `http://localhost:3001`) and sign in as account A (a real inbox).
2. Desk → gift icon → **Enter Recipient Details** → B's email (a real inbox you control, e.g. `you+giftb@gmail.com`) → **Send Gift** → pay with 4242.
3. "Your gift is ready to share" → A's inbox gets the receipt email with `Gift Card.png` (placeholder QR) and the **Claim My Gift** link.
4. Open the link in a private window → **Activate your account** (email greyed out) → password → email code → back on the gift → **Claim My Gift** → quiz ("Let's personalize your legacy build.") → Desk with full access.
5. As A: Account → **Gift & Invite** shows the gift as "Claimed".
6. Optional: in Stripe (test mode) refund the payment → B loses lifetime access.
7. Phone (Part H): sign in as A → gift icon on Desk/Library → screens and form; Account → **Gift & Invite** shows the history.

## Never do (for this testing)

- `npx convex deploy`, or any Convex command while the dashboard picker says *Production*.
- `vercel deploy --prod`, or editing Production environment variables in Vercel.
- Stripe changes while the dashboard is in **live** mode.
- Putting the RevenueCat keys back into `apps/native/.env.local`.
- Committing any `.env.local` file.
