# Amioprowears — Claude Code Guide

Custom football jersey store for the Nigerian market. Solo founder with a technical
background (knows TypeScript, not a professional developer). Explain non-obvious
decisions briefly in plain language, and prefer simple, boring solutions over clever ones.

The full product spec lives in `docs/SPEC.md`. Read it before starting any phase.
This file holds the rules that apply to every session. Next.js version-specific notes
(bundled docs in `node_modules/next/dist/docs/`) are in @AGENTS.md.

---

## Stack (all free tier, commercial use allowed)

| Layer | Choice |
|---|---|
| Framework | Next.js (App Router) + TypeScript (strict) — use the latest version that `@opennextjs/cloudflare` officially supports |
| Styling | Tailwind CSS |
| Hosting | Cloudflare Workers via `@opennextjs/cloudflare` (Workers Free plan) |
| Database / Auth / Storage | Supabase (Postgres, Auth for admin, Storage for images) |
| Payments | Paystack (live now) — crypto provider slot prepared but disabled |
| Email | Brevo (transactional + newsletter list) |
| Owner alerts | Telegram Bot API (free) + Brevo email |
| Mailbox | Zoho Mail (support@, admin@) |
| Repo | GitHub → Cloudflare Workers Builds (auto-deploy on push to `main`) |

**Not used:** Vercel (Hobby plan bans commercial use), WhatsApp Business API, Termii,
SMS OTP (all cost money). WhatsApp is used ONLY for the free floating click-to-chat
button: a plain `https://wa.me/<number>?text=…` link to the owner's WhatsApp, on every
store page. No automated WhatsApp messages are sent to anyone.

### Cloudflare Workers constraints (important)
- Runtime is `workerd` with `nodejs_compat`. Do NOT use `export const runtime = "edge"`.
- Free plan: 100k requests/day, ~10 ms CPU per request. Keep server work light:
  statically render or cache catalogue/product pages (ISR / `revalidate`), keep heavy
  work out of request paths. If we hit CPU limits, the fix is Workers Paid ($5/mo) — tell the owner, don't silently work around it.
- Avoid Node-only middleware/proxy. Protect `/admin` with a server-side check, not middleware:
  `app/(admin)/admin/(panel)/layout.tsx` guards the panel (the login page sits outside it), and
  because layouts don't re-run on every navigation, EVERY admin page calls `requireAdmin()` and
  every admin server action goes through `adminAction()` (`lib/admin/`). RLS is the last lock.
- Always test with `npm run preview` (workerd) before saying something works — `next dev` can hide Workers-only bugs.
- Images: compress to WebP (max 1600px) in the browser before upload; serve directly from
  Supabase Storage with `unoptimized` images (Cloudflare image optimisation is not free at volume).

---

## Non-negotiable rules

1. **Money is integer naira** everywhere in code and DB (`integer`, not float). Convert to
   kobo (`× 100`) only at the Paystack API boundary.
2. **Server is the source of truth for prices.** The client sends only IDs, sizes,
   customisation text, badge IDs, quantities, state and voucher code. The server
   recalculates every line, delivery fee and discount from the DB. Never trust a price
   from the browser.
3. **Payment confirmation is idempotent** and happens in one function
   (`markPaymentSuccessful(reference)`), called by BOTH the redirect verify route and the
   webhook. It must: check the amount matches, update order + payment, redeem the voucher
   atomically (Postgres function), and send notifications exactly once (`notified_at`).
4. **Paystack webhook signature** (HMAC SHA-512 of raw body with secret key) must be
   verified before anything is trusted.
5. **Row Level Security on every table.** Public (anon) may only read active products,
   badges, and public settings. Orders, payments, vouchers, subscribers: server only
   (service role) or admin.
6. **Service role key and secret keys never reach the client.** Only `NEXT_PUBLIC_*`
   vars are browser-safe.
7. **Order tracking never leaks personal data.** `/track` requires order number + phone
   number, and shows status and items only.
8. **Payment providers go through the `PaymentProvider` interface** in `lib/payments/`.
   Never call Paystack directly from pages or components.
9. Validate every API input with `zod`. Return clear error messages.
10. Mobile first. Design and test at 375px width before desktop.

---

## Pricing rule: Paystack fee is built into prices

Paystack local cards: **1.5% + ₦100**, the ₦100 is waived under ₦2,500, total fee capped at ₦2,000.
The owner enters what they want to **receive** (net); the admin UI shows the customer
price computed by `lib/pricing.ts`:

```ts
// net → customer price, rounded UP to nearest ₦50 (admin can override)
grossUpJersey(net)  = roundUp50( min( (net + 100) / 0.985 , net + 2000 ) )
grossUpAddon(net)   = roundUp50( net / 0.985 )   // customisation fee, badges, delivery
```

The jersey carries the ₦100 flat fee (every order has at least one jersey); add-ons and
delivery carry only the 1.5%. Keep the constants in one place (`PAYSTACK_FEE` in
`lib/pricing.ts`) so they can be updated if Paystack changes its rates. Full worked
examples in `docs/SPEC.md` → Pricing.

---

## Conventions

- Folder layout as in `docs/SPEC.md`. Shared types in `types/index.ts`.
- Supabase: `@supabase/ssr` — `lib/supabase/client.ts` (browser), `lib/supabase/server.ts`
  (server components/routes), `lib/supabase/admin.ts` (service role, server only, import
  guarded with `import "server-only"`).
- DB changes only through SQL files in `supabase/migrations/` (numbered). Never edit an
  applied migration — add a new one.
- Cart state: Zustand with `persist` (localStorage). Cart stores IDs and choices, not prices.
- Product photos are 4:5. Customiser overlays are % of the photo (`left` = centre,
  `top` = top edge, `fontSize` = % of photo width), so admin uploads must be 4:5 (pad/crop
  in the browser compressor) or the print won't line up.
- Fonts via `next/font/google`: Roboto (UI), Bebas Neue + Oswald (jersey name/number).
- Commit after each working feature with a clear message. Don't commit `.env.local` or `.dev.vars`.
- When a task needs the owner to do something outside the code (dashboard setting,
  secret, DNS), stop and give exact click-by-click steps.

## Commands

```bash
npm run dev        # Next.js dev server (fast iteration)
npm run preview    # build + run in workerd locally (test here before deploying)
npm run deploy     # build + deploy to Cloudflare
npm run typecheck  # next typegen + tsc --noEmit
npm run lint
npm test           # vitest (tests/)
npm run db:check   # verify the live Supabase project (keys, migrations, RLS) using .env.local
```

Node 22 is required (`.nvmrc`). On this WSL machine it's installed with nvm; the Windows
`npm` under `/mnt/c/...` must not be used.

Local secrets: `.env.local` (for `next dev`) and `.dev.vars` (for `preview`). Production
secrets: Cloudflare dashboard → Workers → Settings → Variables and Secrets. See
`.env.example` for the full list.

---

## Current status

- [x] Spec finalised (v2: Cloudflare hosting, no paid WhatsApp, Telegram alerts, fee-inclusive pricing, crypto-ready payments)
- [x] Most accounts created (Supabase, Paystack, Brevo, Zoho, GitHub, domain)
- [x] Cloudflare account + wrangler login (workers.dev subdomain: `amioyeko13`)
- [x] Paystack test keys (local + Cloudflare runtime secrets); test webhook URL set in Paystack
- [x] Telegram bot `@Amioprowears_orders_bot` + chat ID (local files + Cloudflare secret; chat ID in `wrangler.jsonc` vars)
- [ ] Email setup (owner, in progress — full guide was given in chat 2026-09-25):
  - [x] Part 1: DNS moved to Cloudflare — nameservers `ashley`/`kipp.ns.cloudflare.com` live; waiting for Cloudflare to show "Active"
  - [x] Part 2: Zoho (verified 2026-09-26: MX, SPF, DKIM `zmail` all live) — verify domain (TXT), mailbox `admin@`, aliases `support@` + `orders@`, MX/SPF/DKIM in Cloudflare DNS
  - [x] Part 3: Brevo — domain authenticated, sender `orders@` active, API key + list ID 3 ("Newsletter") work; test email sent 2026-09-26
  - [x] Part 4: Brevo/Telegram/owner vars in `.env.local` + `.dev.vars` + Cloudflare (secrets in dashboard, non-secret values in `wrangler.jsonc` `vars` — dashboard text vars are wiped on deploy)
  - Note: support@ doesn't receive mail until Part 2 is done (the footer already shows it). Only ONE `v=spf1` and ONE `_dmarc` record — merge, don't duplicate.
- [x] **Phase 1 — Foundation** (done 2026-09-25)
  - [x] Scaffold (Next 16.3 + @opennextjs/cloudflare 1.20), strict TS, Tailwind v4, vitest, zod, zustand, @supabase/ssr
  - [x] `lib/pricing.ts`, `lib/delivery-zones.ts`, `lib/format.ts` + 91 passing tests
  - [x] Migrations 0001–0003 written and dry-run tested (PGlite)
  - [x] Fonts, tokens, UI kit, store layout, chat button, `.env.example`
  - [x] First deploy: https://amioprowears.amioyeko13.workers.dev
  - [x] Supabase keys set, migrations 0001–0003 applied, `npm run db:check` passes
  - [x] GitHub connected to Workers Builds — every push to `main` auto-deploys
- [x] **Phase 2 — Catalogue & product pages** (done 2026-09-25)
  - [x] Homepage collection rows, `/catalogue` (URL filters + sort, filtered in the browser from one static page), `/jersey/[slug]` (gallery, sizes, sale price, sticky mobile bar)
  - [x] All store pages statically generated, `revalidate = 300`; filter logic in `lib/catalogue.ts` with tests
- [x] **Phase 3 — Customiser** (done 2026-09-25)
  - [x] Live name/number/badge overlays (% positions, `cqw` text, long names shrink to fit), Front/Back toggle, plain option, live price, sticky mobile preview
  - [x] `lib/customizer.ts`, `lib/validation.ts` (`cartLineSchema` for checkout), `lineUnitPrice` in `lib/pricing.ts`, with tests
  - [x] Migration 0004 (sample products' overlay positions) applied
  - [x] Owner checked customisation on a real phone (numbers like "01" now kept as typed)
- [x] **Phase 4 — Cart, checkout, Paystack** (done 2026-09-25)
  - [x] Server-side pricing + vouchers (`lib/order-pricing.ts`, `lib/vouchers.ts`), `PaymentProvider` + Paystack + crypto stub, idempotent `markPaymentSuccessful` (`lib/payments/confirm.ts`)
  - [x] Migration 0005 (`create_order()` transaction, `orders.attention_note`) applied
  - [x] Cart page + drawer, checkout, order confirmation, `/track`; all API routes
  - [x] All 5 test-card scenarios passed on the live site (APW-1007 success, 1008 declined, 1011 webhook confirmed before the redirect, 1010 voucher then "already used", tampered price ignored)
  - [x] Workers plan decided: staying on Free (checkout uses 13–90 ms CPU vs 10 ms; bursts tolerated so far)
- [x] **Phase 5 — Notifications & newsletter** (done 2026-09-26)
  - [x] Code: `lib/notify/` (Brevo, Telegram, templates, exactly-once `run.ts`), `lib/newsletter.ts`, `/api/newsletter`, 11 tests
  - [x] Live test APW-1012: verify + webhook in the same second, notified once; customer email, Telegram, owner email and newsletter sync all arrived once
  - Decision: owner stays on Workers **Free** plan (keep server CPU low; upgrade only if customers hit error 1102)
- [ ] **Phase 6 — Admin** (code done 2026-09-26, waiting on owner steps)
  - [x] Login + guard, dashboard, orders (filters, detail, status + customer emails incl. new "cancelled"
    email, mark refunded, clear attention note, waybill), products (form, browser WebP 4:5 upload,
    net-price helper, sizes/stock, badges, position editor, copy positions, delete-or-hide), bulk
    price, badges, vouchers (generator, bulk random codes, edit, usage), newsletter (list, CSV,
    Brevo sync in batches of 20), analytics (Lagos time), settings + store announcement bar
  - [x] Tested in `npm run preview` at 375px with a temporary admin (deleted afterwards)
  - [x] Migration 0006 applied (`npm run db:check` passes)
  - [x] Owner admin login `admin@amioprowears.com` created and in `admin_users`
  - [x] Deployed live 2026-09-26 (`/admin` redirects to login; store pages still 200)
  - [ ] Owner: add a real jersey from a phone and fulfil a test order end to end (the "done when")
- [ ] Phase 7 — Legal pages, SEO, launch ← NEXT
  - [ ] Delete test data in Supabase: orders APW-1001–1012 (their payments + items delete with them;
    delete `voucher_redemptions` rows first), voucher `TEST-ONCE`, and test newsletter subscribers.
    Until then, opening an old confirmation page for APW-1001–1011 sends a real alert (never notified).
- [ ] Post-launch — customer accounts (email magic link), wishlist, crypto

Update this checklist at the end of every session, and add a one-line note under
"Session log" describing what was done and what's next.

## Session log

- 2026-09-25 — Phase 1 build: scaffolded app, core libs + tests, Supabase clients/types,
  migrations 0001–0003 (added: `redeem_voucher` is idempotent per order and not callable by
  anon; order-number sequence revoked from API roles), design system + store layout, first
  deploy to workers.dev. Next: owner applies
  migrations + connects Workers Builds, then Phase 2.
- 2026-09-25 — Migrations applied (db:check passes), Workers Builds connected and first
  auto-deploy succeeded. Phase 1 complete. ISR cache set up: R2 bucket `amioprowears-cache`,
  D1 tag cache `amioprowears-tag-cache`, Durable Object revalidation queue. Next: Phase 2.
- 2026-09-25 — Phase 2: homepage collection rows, catalogue with URL filters/sort
  (`lib/catalogue.ts`, filters applied client-side via `history.pushState` so no server
  round-trip), product pages via `generateStaticParams` + ISR, `lib/products.ts` using a
  cookie-free anon client (`lib/supabase/public.ts`). Plain "Add to cart" (size only) is in
  `ProductPurchase.tsx`, which Phase 3 extends with the customiser. Phase 6 admin saves
  must call `revalidatePath` for `/`, `/catalogue` and `/jersey/[slug]`. Verified at 375px
  in preview and live. Next: Phase 3.
- 2026-09-25 — Phase 3: `JerseyCustomizer` (replaces ProductPurchase) with live overlays
  (`JerseyOverlay.tsx`), badges + name/number fee loaded at build time
  (`getProductBadges`, `getStoreSettings`). On phones, scroll-padding keeps focused inputs
  out from under the sticky preview/bar. Checkout (Phase 4) must validate lines with
  `cartLineSchema` and price them with `lineUnitPrice` from DB values. Verified at 375px
  in preview and live on 4 products. Next: owner real-phone check, then Phase 4.
- 2026-09-25 — Phase 4: cart/drawer/checkout/confirmation/track + all APIs. Paystack test
  flows verified live with `wrangler tail`: webhook confirmed APW-1011 0.7 s before the browser
  returned. CPU (from tail, steady state): browsing 3–9 ms; checkout page ~41 ms, confirmation
  32 ms, quote up to 90 ms, /api/checkout 17 ms, webhook 13 ms — over the Free plan's 10 ms, but
  all 60 requests succeeded. Owner to decide on Workers Paid before launch. Test data in DB:
  orders APW-1001–1011 and voucher TEST-ONCE (delete before launch; payments/items cascade,
  delete voucher_redemptions first). Phase 5 fills `lib/notify/index.ts` (`notifyOrderPaid`,
  claim `notified_at` first). Next: Phase 5.
- 2026-09-25 — Owner started email setup: DNS moved from Namecheap to Cloudflare
  (nameservers already public). Next session: confirm Cloudflare shows Active, then help with
  Zoho (Part 2) and Brevo (Part 3) and check records with `dig`; Phase 5 can start as soon as
  the Telegram bot token is available.
- 2026-09-26 — Checked status: DNS on Cloudflare is live; MX still Namecheap email-forwarding
  (Zoho not started). Owner stays on Workers Free. Phase 5 code written: `notifyOrderPaid` claims
  `notified_at` in one conditional UPDATE then sends customer email + Telegram + owner email
  (+ newsletter if opted in) independently; failures add an attention note.
  `sendOrderStatusEmail(orderId, "dispatched"|"delivered")` is ready for Phase 6. `/api/newsletter`
  tested in preview. Note: test orders APW-1001–1011 have `notified_at` empty, so opening their
  confirmation pages will send real notifications. Next: owner does Telegram → Zoho → Brevo steps,
  then a live test order.
- 2026-09-26 — Email setup finished (Zoho MX/SPF/DKIM, Brevo domain auto-authenticated, sender
  `orders@`, list 3), Telegram connected. Non-secret runtime vars moved to `wrangler.jsonc`.
  Live test APW-1012 passed: every notification once. Suggested owner add a `news@` alias + Brevo
  sender for campaigns. Test data to delete before launch now also includes APW-1012 and the
  owner's checkout newsletter subscriber. Next: Phase 6 (admin) — must call
  `sendOrderStatusEmail` on dispatched/delivered and offer "Sync to Brevo" for unsynced subscribers.
- 2026-09-26 — Phase 6 admin built (see checklist). Server actions live in `lib/admin/actions/`
  and use the admin's own Supabase session (RLS applies); `revalidateStore()` drops all cached store
  pages after catalogue/settings saves. Migration 0006 adds `admin_set_product_prices()` so bulk
  price is one request (Free plan = 50 outgoing requests per page load; also why newsletter sync is
  batched). No middleware, so `SessionKeeper` (browser) refreshes the login cookie. Images are
  compressed in the browser and uploaded straight to Storage (Safari falls back to JPEG/PNG). Old
  images are not deleted from Storage when replaced. Next: owner applies 0006 + creates admin
  login, real-phone test, then Phase 7.
