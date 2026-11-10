# Gift Lifetime Access: PM task list

Source: the project manager's task list (SST-1 to SST-10). Each task lists its requirements as
given, then implementation notes that tie it to [gift-lifetime-access.md](gift-lifetime-access.md). "C#" refers to the
conflicts table in that spec.

Platform rule for every task: native iOS + Android, web. Web mobile view = Figma exactly; web desktop = existing desktop conventions.

---

## SST-1: Gifting entry point and navigation
**Requirements**
- Connect the gifting entry point on the Desk page to the Lifetime Subscription Gift experience.
- Users can directly access the gifting purchase journey.
- Consistent navigation and behaviour across web and mobile.
- Works for authenticated users.

**Acceptance**: gifting is reachable from the Desk; navigation works on web, iOS and Android.

**Notes**: gift icon in the Desk header (native `app/(tabs)/index.tsx`, web `features/journal/DashboardDeskPage.tsx` / dashboard header). Figma also places it in the Library header, the Account "Gift & Invite" row and the paywall "Gift Access" card; the task only names the Desk, but all four go to the same route. New routes: native `app/gift/index.tsx` (+ `details`), web `routes/dashboard/gift*.tsx` + `ROUTES.gift*`.

## SST-2: Gift offering page
**Requirements**
- Show lifetime premium access information, what the recipient receives, the benefits, and how gifting and redemption work.
- Clear CTA to proceed.
- Gift details form integrated within the same page through the approved interaction.
- Works across web and mobile.

**Acceptance**: users understand the offer and can enter gift details without unnecessary navigation; all info displays correctly on both platforms.

**Notes**: the "Gift Subscription" screen in Figma. Show the regional price from the store or Stripe, not a hard-coded $99. Resolved C4: follow Figma's two screens.

## SST-3: Gift personalisation and purchaser form
**Fields**: Recipient Name, Recipient Email, Gift Title / Email Subject, Personal Message (500 max), Purchaser Name, Purchaser Email.

**Requirements**
- Auto-fill purchaser info for authenticated users; collect it for public purchases.
- Validate required fields and emails.
- Associate the gift with the correct recipient email.
- Store the personalised info for gift-card generation.
- Keep entered info if payment fails.
- Consistent behaviour across web and mobile.

**Acceptance**: authenticated users don't re-enter their info; public purchasers can give theirs; recipient and purchaser info is stored with the transaction on both platforms.

**Notes**: web uses RHF + Zod (`lib/gift/schemas.ts`); native uses the same Zod schema. Save a `gifts` draft (`pending_payment`) before checkout, and reload it after a failed or cancelled payment. Block the recipient email if it already has lifetime access (decision 9) and, by assumption, the purchaser's own email. Resolved C3: signed-in only, so the purchaser fields are always auto-filled.

## SST-4: Payment processing and gift entitlement backend
**Requirements**
- Stripe for web.
- Mobile methods incl. Apple Pay, Google Pay, WeniCard, subject to provider and platform rules.
- Handle success, failure and cancel.
- Verify payment server-side.
- Generate a unique gift entitlement + redemption id after confirmed payment.
- Associate with recipient email.
- Store purchase and redemption records.
- Idempotent against repeated events and requests.
- Web and mobile share one gifting backend.

**Acceptance**: success → valid gift; fail/cancel → no gift; duplicate callbacks → no duplicates; records linked to transaction and recipient; works on all platforms.

**Notes**: a new Convex domain `convex/gifts/{queries,mutations,actions}.ts`. Fulfilment comes only from webhooks (Stripe `checkout.session.completed`; RevenueCat non-renewing purchase), keyed by `providerRef`. Refund and dispute handling per decision 4. Resolved C1: RevenueCat store product on mobile, Stripe on web; WeniCard dropped.

## SST-5: Gift card generation (PNG)
**Content**: logo and branding, recipient name, purchaser name, gift title, personal message, lifetime access messaging, unique QR code, redemption instructions.

**Requirements**
- High-quality PNG.
- QR tied to the gift's redemption record and scannable on screen or printed.
- Downloadable by the purchaser.
- Shareable by email and messaging apps.
- Print-quality dimensions.

**Acceptance**: every successful gift gets a personalised PNG with correct details; the QR resolves to the right gift; the image is downloadable, shareable and printable.

**Notes**: card design and assets are still to come from the client. Render in a Node Convex action (SVG template → resvg PNG, `qrcode`); the QR encodes `https://app.legacybuildingjournals.com/gift/<token>`. Store in `_storage`; download/share from the Gift & Invite history (native share sheet, web download).

## SST-6: Purchaser email (receipt + gift card)
**Requirements**
- Send the confirmation email to the **purchaser**, with the receipt / transaction confirmation.
- Attach the personalised gift card PNG.
- Include gift info and redemption instructions, and a Claim My Gift link in the gift card.
- Make it clear the purchaser can share or print the gift whenever they choose.
- **Don't** email the recipient at purchase time.
- No duplicate emails from repeated payment events.
- The same workflow for both platforms.

**Acceptance**: the purchaser gets the receipt and card; the card has a working link and QR; the recipient gets nothing automatically; emails go out only after confirmed payment, from either platform.

**Notes**: `gifts/actions.sendPurchaserEmail` (internal), scheduled from the single fulfilment mutation that both the Stripe and RevenueCat webhooks call. Guarded by `purchaserEmailSentAt` so repeated events send nothing. Resend with the PNG attachment.

## SST-7: Recipient redemption and account activation
**Requirements**
- Redeem via unique URL and QR.
- Validate the token first.
- Identify the recipient by the gift's email.
- Provision the account with that email; the recipient creates and confirms a password.
- One combined activation experience (not separate Sign Up / Sign In choices), with a clear **Claim My Gift** CTA.
- Activate lifetime access on claim.
- Prevent double redemption.
- Clear errors for invalid, expired and already-claimed gifts.
- Existing accounts: no duplicates.
- Works on web and mobile.

**Acceptance**: QR and link both work; the right account gets the gift; credentials can be set; claiming activates lifetime; a gift can't be redeemed twice; works on web, iOS and Android.

**Notes**: `/gift/<token>` page. If an account exists for the email → sign in → Claim. If not → Create Account with the email locked (password + confirm, or Google) → Clerk email code → Claim. Signed in with a different email → mismatch message (decision 7a). Redemption is **web only**: the QR and link always open the web app (decision 3b). The account is created only at this step, with consent (C6). If the recipient has a store subscription, show the cancel-it-yourself splash (decision 8).

## SST-8: Recipient onboarding
**Requirements**
- The approved onboarding after activation, explaining the product.
- Focused, with no repetitive confirmations.
- Copy "Let's personalize your legacy build."
- Land at the right starting point.
- Consistent across web and mobile.

**Acceptance**: recipients get the approved onboarding; lifetime is active when they enter; they can proceed on both platforms.

**Notes**: reuse the existing quiz (`features/welcome/*`, `components/welcome/*`) for **new** users only (decision 17), skipping the paywall and trial. The same applies to new users from shared-journal acceptance. Resolved C5: use the SST copy.

## SST-9: Admin gifting analytics
**Requirements**
- Total purchased.
- Successful transactions.
- Redemption activity, purchased vs redeemed.
- Data from real payment and redemption records.
- Admin only.
- Accessible on web and mobile.

**Acceptance**: admins see gifting activity; counts match backend records; regular users can't access it; works on web and mobile.

**Notes**: `convex/admin/queries.ts` (guarded by `admin/helpers.ts`) + `apps/admin/src/routes/_admin/gifts.tsx` + `lib/nav.ts`. Responsive admin web (C7).

## SST-10: Native Library background
**Requirement**: the native Library page background differs from Figma; make them consistent (assets to come).

**Notes**: currently `apps/native/lib/assets.ts#libraryBackground` → `assets/images/LibraryBackground.png`. Figma shows a warm beige wall with leafy branches at the left edge (see `journal-sharing/01-library-our-story-and-journal-menu.png`). Swap in the provided asset; check the web library background against Figma too.

---

## Implementation status (2026-11-09, uncommitted)

| Task | Status |
|---|---|
| SST-1 entry points | Done: Desk/Library gift icon, Account "Gift & Invite", paywall card (web + native). |
| SST-2 offer page | Done (web `/dashboard/gift`, native `/gift`). Hero is a placeholder until the image asset arrives. |
| SST-3 form | Done (web `/dashboard/gift/details`, native `/gift/details`), draft saved before payment and restored via `?giftId=`. |
| SST-4 payments | Web Stripe Embedded Checkout + Adaptive Pricing, webhook + return-page verification, refunds/disputes. Mobile RevenueCat `lifetime_gift` product, server-verified via RevenueCat REST + webhook fallback. Needs store/RevenueCat setup to test. |
| SST-5 gift card | Done: client template (4x6 in @ 300 dpi) with names, title, message, lifetime copy, QR, instructions, link. |
| SST-6 purchaser email | Done (Resend: receipt + PNG attachment + Claim My Gift link, sent once). |
| SST-7 redeem | Done (web `/gift/<token>`): sign in, or sign up with the email greyed out (+ Google), Claim My Gift, Stripe sub auto-cancel at period end, store-sub splash. |
| SST-8 onboarding | Web intro heading uses the SST copy for lifetime users. Native onboarding not needed (redemption is web-only). |
| SST-9 admin | Done: admin Gifts page. |
| SST-10 library background | Done (native). |
| Tests | `packages/backend/convex/gifts/mutations.test.ts` (10 tests). |

### Setup needed before testing
- Convex env: `STRIPE_SECRET_KEY`, `RESEND_API_KEY`, `WEB_APP_URL` (e.g. `http://localhost:5173` on dev, so QR/links point at your local web app), `REVENUECAT_REST_API_KEY` (mobile).
- Stripe webhook endpoint (`<convex-site-url>/stripe/webhook`): also enable `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `charge.refunded`, `charge.dispute.created`. Enable Adaptive Pricing in the Stripe dashboard.
- Mobile: create a consumable in-app product `lifetime_gift` in App Store Connect / Play Console and import it into RevenueCat. Store purchases need a dev/store build (not Expo Go).

## Remaining work for gifting (keep this list current)

**Code: done as of 2026-11-10** (uncommitted): SST-1..10 incl. real gift card (SST-5), admin analytics (SST-9), Library background (SST-10), paywall gift card, resend email, account-deletion handling, admin "Lifetime" labels.

**Small, optional**
- [ ] Native: share/save the card through the share sheet (it opens in the browser today).

**Setup / external**
- [ ] Push the backend to Convex **dev** and set `WEB_APP_URL` (see HANDOFF). The push needs network access on Convex's side to install `@resvg/resvg-js` (external package).
- [ ] Stripe test mode: add the 4 webhook events; Adaptive Pricing.
- [ ] Vercel Preview builds of `staging` (web + admin) with dev env vars.
- [ ] Mobile payments later: `lifetime_gift` store product + RevenueCat + a store/dev build.

**Verification still owed**
- [ ] End-to-end on the cloud sandbox (purchase → email → QR → sign-up → quiz → lifetime; failed/cancelled payment; refund).
- [ ] Screens at 375 / 768 / 1280 (web) and in Expo Go; admin Gifts page on a phone.
- [ ] Real Resend email (Gmail/Outlook rendering, the PNG attachment, forwarding).
