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
- Avoid Node-only middleware/proxy. Protect `/admin` with a server-side check in
  `app/(admin)/admin/layout.tsx`, not middleware.
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
- [ ] Confirm: Telegram bot token + chat ID, Paystack test keys
- [x] **Phase 1 — Foundation** (done 2026-09-25)
  - [x] Scaffold (Next 16.3 + @opennextjs/cloudflare 1.20), strict TS, Tailwind v4, vitest, zod, zustand, @supabase/ssr
  - [x] `lib/pricing.ts`, `lib/delivery-zones.ts`, `lib/format.ts` + 91 passing tests
  - [x] Migrations 0001–0003 written and dry-run tested (PGlite)
  - [x] Fonts, tokens, UI kit, store layout, chat button, `.env.example`
  - [x] First deploy: https://amioprowears.amioyeko13.workers.dev
  - [x] Supabase keys set, migrations 0001–0003 applied, `npm run db:check` passes
  - [x] GitHub connected to Workers Builds — every push to `main` auto-deploys
- [ ] **Phase 2 — Catalogue & product pages** ← NEXT
- [ ] Phase 3 — Customiser
- [ ] Phase 4 — Cart, checkout, Paystack
- [ ] Phase 5 — Notifications & newsletter
- [ ] Phase 6 — Admin
- [ ] Phase 7 — Legal pages, SEO, launch
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
