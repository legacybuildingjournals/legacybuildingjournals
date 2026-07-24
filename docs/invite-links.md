# Invite links — what's left to make them work

The referral flow is built and works locally against the **dev** Convex
deployment. This document lists everything still required for a real invite link
to behave correctly in production, in the order it has to happen.

## How the link is meant to work

There is exactly **one** link, whoever shares it and from wherever:

```
https://app.legacybuildingjournals.com/invite/<CODE>
```

It is never a `legacy-building://` link — that would be a dead end for anyone
without the app installed, which is most of the people being invited. The
landing page adapts to whoever opens it:

| Opened on | What happens |
|---|---|
| iPhone | Landing page → **App Store** button + the code shown in plain text |
| Android | Landing page → **Play testing opt-in** button + the code |
| Desktop | Redirects straight to web signup |
| Phone with the app installed | Should open the app directly (needs step 4/5 below) |

The code is displayed prominently on purpose. Someone who installs from a store
lands in a brand-new app that has no memory of the link they tapped — reading
the code off this page and typing it into onboarding is the only thing that
closes that gap. No SDK can close it for free.

## Status

| | Status |
|---|---|
| Backend (schema + `convex/referrals/*`) | ✅ built, deployed to **dev only** |
| Native Community tab + share sheet | ✅ built |
| Invite code field in onboarding (native + web) | ✅ built |
| `/invite/:code` landing page | ✅ built |
| iOS Universal Links | ⚠️ configured, **not verifiable until web is deployed** |
| Android App Links | ❌ blocked on a Play Console fingerprint |
| Production deploys | ❌ nothing is live |

## Remaining work, in order

### 1. Deploy the backend to production

Everything so far has gone to the **dev** deployment. Production is a different
one and has none of it — no `inviteCode` column, no referral functions.

```
dev  : exuberant-lark-860.convex.cloud
prod : third-quail-997.convex.cloud     (apps/native/eas.json → production profile)
```

```bash
cd packages/backend
pnpm exec convex deploy          # pushes schema + functions to prod
```

The new `users` columns are all `v.optional(...)`, so existing rows are
unaffected and no migration is needed.

### 2. Deploy the web app

`https://app.legacybuildingjournals.com/invite/ANYTHING` returns 404 today, so
**every shared link is broken until this ships**. This deploy also publishes the
Apple verification file that step 4 depends on.

Verify afterwards:

```bash
curl -sI https://app.legacybuildingjournals.com/.well-known/apple-app-site-association \
  | grep -i content-type
# must be: application/json
```

If that header is wrong or the response is HTML, iOS silently refuses to verify
the domain. `apps/web/vercel.json` sets the header; the SPA rewrite is fine
because Vercel checks the filesystem before applying rewrites.

### 3. Ship a native app update

The App Store currently has **1.0.2**, and `apps/native/app.json` still says
`1.0.2` — the same build. Nothing in this feature exists for real users until a
new version ships: no Community tab, no invite field, no link handling.

- Bump `expo.version` (1.0.3)
- `eas build --profile production` (or the local `xcodebuild` route)
- Submit to App Store / Play

The production EAS profile already points at prod Convex and the prod web URL,
so no env changes are needed.

### 4. Finish iOS Universal Links

Already done:

- `apps/native/app.json` → `ios.associatedDomains: ["applinks:app.legacybuildingjournals.com"]`
- `apps/web/public/.well-known/apple-app-site-association`, scoped to `/invite/*`
  only, declaring `QP59XV2BMK.com.legacybuildingjournals.app`
- `apps/native/app/invite/[code].tsx` receives the link and prefills onboarding

Still required:

1. Step 2 must be live **first** — iOS fetches the file when the app installs and
   **caches a failure**. Install a build before the file is up and links stay
   broken on that device until it reinstalls.
2. Ship a device build (step 3). Simulator builds are ad-hoc signed and iOS does
   not verify universal links on them at all — do not test this on a simulator.

Verify on a real device by tapping an invite link from Notes or Messages. Typing
the URL into Safari's address bar deliberately does *not* trigger a universal
link; that is expected iOS behaviour, not a bug.

### 5. Wire Android App Links

Not started. Needs one value only you can get:

> **Play Console → your app → Setup → App integrity → App signing key
> certificate → SHA-256 fingerprint**
>
> The *app signing* key, not the upload key.

Then:

1. Create `apps/web/public/.well-known/assetlinks.json`:

   ```json
   [
     {
       "relation": ["delegate_permission/common.handle_all_urls"],
       "target": {
         "namespace": "android_app",
         "package_name": "com.legacybuildingjournals.app",
         "sha256_cert_fingerprints": ["<SHA-256 HERE>"]
       }
     }
   ]
   ```

   The `Content-Type` header for it is already configured in `vercel.json`.

2. Add `intentFilters` to `apps/native/app.json` under `expo.android`, scoped to
   `/invite/*` with `autoVerify: true`.
3. `pnpm exec expo prebuild` and rebuild.

Do not add the intent filter without the file — a half-configured App Link makes
Android show a "which app?" chooser, which is worse than opening the browser.

### 6. When Android leaves closed testing

The landing page currently sends Android users to the **testing opt-in** link,
because a new invitee is not a tester yet and the normal store listing 404s for
them. Once the app is on open/production release, flip one constant:

```ts
// apps/web/src/lib/referrals/storeLinks.ts
export const ANDROID_IS_PUBLIC = false;   // → true
```

That switches both the URL and the button label. There is a second copy of the
Play URL in `apps/native/lib/community/content.ts` used by the share sheet's
store tile — update both.

## Deliberate scoping

Universal Links are claimed for `/invite/*` **only**. Claiming the whole domain
would make every dashboard, billing and legal link open the app, which changes
existing flows in surprising ways. Widen it deliberately, not by accident.

Worth knowing: this entitlement is the prerequisite for *any* https→app link.
Password-reset emails, Stripe billing returns and shared journal entries all
currently drop mobile users into a browser. Once step 4 is done, extending to
those paths is just another entry in the AASA file.

## Known gaps

- **The App Store install gap cannot be closed for free.** Tap link → App Store →
  install → the fresh app has no memory of the referral. Universal Links do not
  help; only the code shown on the landing page does. A deferred-deep-link
  vendor (Branch, AppsFlyer) would close it, at the cost of an SDK, a native
  rebuild and a monthly bill.
- **Web users cannot invite anyone.** The Community page is native-only by
  request, and that page is the only place an invite code is generated and
  shared. Web users can be invited but never send invites.
- **Existing users cannot be attributed.** `claimInvite` is refused once
  `welcomeCompletedAt` is set. This is intentional — they joined before the
  programme existed — but it means the counter only ever reflects genuinely new
  signups.

## File map

| Path | Role |
|---|---|
| `packages/backend/convex/referrals/` | Code generation, claim, count |
| `packages/backend/convex/referrals/codes.ts` | Code format, shared with both clients |
| `apps/native/app/(tabs)/community.tsx` | Community tab |
| `apps/native/components/library/invite-share-sheet.tsx` | Share sheet (code, QR, targets) |
| `apps/native/lib/community/content.ts` | Social links, updates copy, store URLs |
| `apps/native/app/invite/[code].tsx` | Receives universal links |
| `apps/native/app/welcome.tsx` | Invite field in onboarding |
| `apps/web/src/routes/invite.$code.tsx` | Landing page routing |
| `apps/web/src/features/referrals/InviteLandingPage.tsx` | Landing page UI |
| `apps/web/src/features/welcome/InviteCodeField.tsx` | Invite claim on web onboarding |
| `apps/web/src/lib/referrals/storeLinks.ts` | Store URLs + platform detection |
| `apps/web/public/.well-known/` | Domain verification files |

## Testing without deploying anything

The core loop can be exercised entirely on dev, because the code is typed by
hand and does not need the link to resolve:

1. Sign in → **Community** → **Share Invite Link** → note the code
2. Sign out, sign up as a brand-new account
3. Enter that code in **Invite code (optional)** during onboarding
4. Sign back in as the first account — Community should read **1 Friend Invited**

Worth also checking the guards: your own code is rejected, an unknown code is
rejected, and a code entered after onboarding is finished is refused.
