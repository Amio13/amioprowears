# Amioprowears — Product Spec (v2)

Custom football jersey ecommerce store for Nigeria. Guest checkout, motor-park delivery,
real-time jersey customiser, Paystack payments, fee-inclusive pricing.

**What changed from v1:** hosting moved from Vercel to Cloudflare Workers (Vercel's free
plan bans commercial use); all paid WhatsApp messaging removed (Termii, WhatsApp API);
owner alerts now via Telegram bot + email; customer confirmations via email (so email is
now required at checkout — Paystack needs it anyway); phone-OTP accounts moved to
post-launch as free email magic links; Paystack fees built into prices; payment layer
made provider-agnostic so crypto can be added later; added webhook, payments table,
RLS, and server-side price calculation.

---

## 1. Design

- **Vibe:** high-energy and sporty, clean like the official Nike site. Big product
  imagery, confident type, lots of white space so jerseys carry the colour.
- **Brand colours:** red and white. Primary actions `bg-red-600` (hover `red-700`), white
  and light-grey (`neutral-50/100`) surfaces, near-black text (`neutral-900`). Red is for
  actions and highlights only, not large backgrounds, so product photos stay the focus.
- **Type:** Roboto for UI (400/500/700). Bebas Neue for jersey names/numbers in the
  customiser and for large display headings; Oswald as the alternative jersey font.
- **Mobile first:** design at 375px, then scale up. Tap targets ≥ 44px. Sticky
  "Add to cart" bar on product pages on mobile.
- **Copy:** plain, short, sentence case. Buttons say what happens ("Add to cart",
  "Pay ₦18,450"). Errors say what went wrong and how to fix it.
- Accessibility floor: visible focus rings, alt text on all product images, colour
  contrast AA, respects `prefers-reduced-motion`.

---

## 2. Routes

```
/                           Homepage (collections, new arrivals)
/catalogue                  All jerseys + filters (state in URL search params)
/jersey/[slug]              Product detail + customiser
/cart                       Cart
/checkout                   Checkout form + payment
/order-confirmation/[id]    After payment (id = order uuid, unguessable)
/track                      Order tracking (order number + phone)
/about  /contact
/delivery  /returns  /privacy  /terms      Policy pages (Paystack requires these)

/admin                      Dashboard (admin only)
/admin/orders               Orders list + detail + status updates
/admin/products             Products list, add/edit, bulk price update
/admin/badges               Badges add/edit
/admin/vouchers             Generate + manage vouchers
/admin/newsletter           Subscribers
/admin/analytics            Sales overview
/admin/settings             Customisation fee, store open/closed, announcement bar
/admin/login

/api/checkout                          POST: create order + start payment
/api/payments/verify                   GET:  verify after redirect (?reference=)
/api/payments/paystack/webhook         POST: Paystack webhook
/api/payments/crypto/webhook           POST: reserved, returns 404 while crypto disabled
/api/vouchers/validate                 POST: preview a voucher on the cart
/api/newsletter                        POST: footer signup
/api/track                             POST: order lookup (order number + phone)
```

---

## 3. Features

### 3.1 Catalogue and filters
- Filters: Club, Gender (male/female/kids), Type (player/fan), Era (current/vintage),
  Price range, Size in stock. Multiple filters combine (AND across groups, OR within a group).
- Filters live in the URL (`/catalogue?club=arsenal&gender=female`) so they're shareable
  and work with the back button.
- Sort: newest, price low→high, price high→low.
- Homepage collections (a product can be in several): New Arrivals, Super Eagles,
  Champions League, Female Kits, Vintage Collection. Stored as `products.collections text[]`.
- Catalogue and product pages are statically generated with revalidation (e.g. 5 min)
  and revalidated on demand when admin saves a product.

### 3.2 Real-time customiser
- Flat-lay jersey photo with Front / Back toggle.
- Name (max 12 chars, letters/spaces/hyphen, auto uppercase) renders on the back in real
  time; Number (0–99, digits only) renders below it.
- Badge picker (badges allowed for that product) renders on the front at the badge's position.
- Implementation: CSS absolute positioning over the image, positions in **percentages**
  from `products.customizer` JSON so it scales with the image. Text scales with container
  width (`cqw` units or a ResizeObserver).
- Plain jersey option: customer can skip customisation.
- Price updates live: jersey price + name/number fee (if filled) + badge price.
- Mobile: jersey preview is `sticky top-0` while the inputs scroll beneath it. Desktop:
  two columns, preview left, options right.
- Admin can fine-tune overlay positions per product with sliders and a live preview.

`products.customizer` shape:
```json
{
  "name":   { "top": 18, "left": 50, "width": 60, "fontSize": 9 },
  "number": { "top": 30, "left": 50, "width": 40, "fontSize": 28 },
  "badges": { "left_chest": { "top": 22, "left": 64, "width": 14 },
              "sleeve":     { "top": 20, "left": 12, "width": 10 } },
  "textColor": "#FFFFFF",
  "font": "bebas"
}
```

### 3.3 Pricing (Paystack fee built in)

Paystack local card fee: **1.5% + ₦100**, the ₦100 is waived for transactions under
₦2,500, and the fee is capped at ₦2,000 per transaction. International cards are 3.9%
+ ₦100 (not covered by this formula; rare for this market).

The owner thinks in **net** (what lands in the bank). Admin forms have a "You receive"
input that fills the customer price live; the owner can override the suggestion.
Only the customer price is stored.

```ts
// lib/pricing.ts
export const PAYSTACK_FEE = { pct: 0.015, flat: 100, flatThreshold: 2500, cap: 2000 };

export const roundUpTo = (n: number, step = 50) => Math.ceil(n / step) * step;

/** Jersey price: carries the ₦100 flat fee once per order (every order has ≥1 jersey). */
export function grossUpJersey(net: number): number {
  const { pct, flat, cap } = PAYSTACK_FEE;
  return roundUpTo(Math.min((net + flat) / (1 - pct), net + cap));
}

/** Add-ons and delivery: carry only the percentage fee. */
export function grossUpAddon(net: number): number {
  return roundUpTo(net / (1 - PAYSTACK_FEE.pct));
}

/** Exact fee Paystack will charge on a total (for reports/analytics). */
export function paystackFee(total: number): number {
  const { pct, flat, flatThreshold, cap } = PAYSTACK_FEE;
  return Math.min(total * pct + (total >= flatThreshold ? flat : 0), cap);
}
```

Worked examples (customer price rounded up to ₦50):

| You want to receive | Customer price | Paystack fee | You actually receive |
|---|---|---|---|
| ₦10,000 jersey | ₦10,300 | ₦254.50 | ₦10,045.50 |
| ₦12,000 jersey | ₦12,300 | ₦284.50 | ₦12,015.50 |
| ₦15,000 jersey | ₦15,350 | ₦330.25 | ₦15,019.75 |
| ₦20,000 jersey | ₦20,450 | ₦406.75 | ₦20,043.25 |
| ₦25,000 jersey | ₦25,500 | ₦482.50 | ₦25,017.50 |
| ₦35,000 jersey | ₦35,650 | ₦634.75 | ₦35,015.25 |
| ₦500 name+number | ₦550 (or ₦510 if rounding to ₦10) | — | — |

Whole-order check: ₦15,350 jersey + ₦550 name/number + ₦2,550 Zone B delivery =
₦18,450. Fee = 1.5% × 18,450 + 100 = ₦376.75. Owner receives ₦18,073.25 against a
target of ₦18,000. With two jerseys the ₦100 is covered twice, so you slightly
over-recover — that's fine.

Rules:
- Each product has its own `price`; optional `sale_price` (if set and lower, it's shown
  with the original struck through and used for the order).
- Bulk update: admin selects products by filter/collection and applies "+/- ₦X" or
  "+/- X%" (re-rounded to ₦50) or "set net price to ₦X".
- Voucher discounts come off the customer price. A ₦1,000 voucher costs the owner
  about ₦985 net (the fee drops too).
- Required unit tests (vitest): every row of the table above, cap boundary
  (net ₦124,667 and above → price = net + 2,000), and `paystackFee` below/above ₦2,500.

### 3.4 Delivery zones (motor-park pickup, not door-to-door)

Customer fees already include the 1.5% Paystack share (`grossUpAddon`).

| Zone | States | Net | Customer fee |
|---|---|---|---|
| A | Abia, Anambra, Ebonyi, Enugu, Imo | ₦2,000 | ₦2,050 |
| B | Lagos, Ogun, Oyo, Osun, Ondo, Ekiti, Rivers, Delta, Edo, Bayelsa, Cross River, Akwa Ibom | ₦2,500 | ₦2,550 |
| C | FCT Abuja, Kano, Kaduna, Katsina, Sokoto, Zamfara, Jigawa, Kebbi, Niger, Plateau, Benue, Kogi, Kwara, Nasarawa, Gombe, Bauchi, Adamawa, Taraba, Borno, Yobe | ₦3,500 | ₦3,600 |

All 36 states + FCT are covered. Defined in `lib/delivery-zones.ts` as a typed constant
with `getZoneForState(state)` and unit tests that every state maps to exactly one zone.
Delivery is charged once per order regardless of quantity.

Delivery copy (checkout, email, /delivery page): "We send your order to the motor park
you choose. The logistics company will call the phone number you give us when it
arrives. Bring your order number and a valid ID to pick it up."

### 3.5 Checkout form

```
Full name               text, required
Phone number            tel, required, Nigerian format (0803… or +234…), stored as 234XXXXXXXXXX
Alternative phone       tel, optional (for the logistics company)
Email                   email, required (receipt + Paystack requires it)
State                   select (37 options), required → shows delivery fee instantly
City / LGA              text, required
Nearest motor park      text, required (goes on the waybill)
Voucher code            text + Apply button, optional
Order notes             textarea, optional
☐ Send me Amioprowears deals and new drops    (unchecked by default)
Payment method          radio — only shown when more than one provider is enabled
[ Pay ₦XX,XXX ]
```

Order summary sidebar/sheet: items with customisation, subtotal, delivery (Zone X),
voucher discount, total. On mobile the summary is a collapsible panel above the form.

### 3.6 Payment architecture (Paystack now, crypto later)

All providers implement one interface so adding crypto is a new file, not a rewrite.

```ts
// lib/payments/types.ts
export type ProviderId = "paystack" | "crypto";

export interface InitializeInput {
  orderId: string;
  orderNumber: string;
  amountNaira: number;
  email: string;
  callbackUrl: string;
  metadata: Record<string, unknown>;
}

export interface PaymentProvider {
  id: ProviderId;
  label: string;                 // shown at checkout, e.g. "Card, bank transfer or USSD"
  isEnabled(): boolean;
  initialize(input: InitializeInput): Promise<{ reference: string; redirectUrl: string }>;
  verify(reference: string): Promise<{
    status: "success" | "failed" | "pending";
    amountNaira: number;         // amount actually paid, converted to naira
    providerFee?: number;
    raw: unknown;
  }>;
  /** Verifies the signature; returns null if invalid or irrelevant. */
  parseWebhook(req: Request): Promise<{ reference: string } | null>;
}
```

- `lib/payments/providers/paystack.ts` — full implementation (Initialize Transaction,
  Verify Transaction, webhook HMAC SHA-512 with `x-paystack-signature`).
- `lib/payments/providers/crypto.ts` — stub: `isEnabled()` returns
  `process.env.ENABLE_CRYPTO === "true"`, other methods throw `NotImplemented`.
- `lib/payments/index.ts` — `getProvider(id)`, `getEnabledProviders()`.
- `lib/payments/confirm.ts` — `markPaymentSuccessful(reference)`: the one idempotent
  function both verify and webhook call (see CLAUDE.md rule 3).

Flow:
1. `POST /api/checkout` → validate with zod → recompute all prices from DB → create
   `orders` row (`payment_status = unpaid`) + `order_items` → create `payments` row →
   `provider.initialize()` → return `redirectUrl`.
2. Customer pays on Paystack → redirected to
   `/order-confirmation/[id]?reference=…` → page calls verify → `markPaymentSuccessful`.
3. Paystack also calls the webhook → `markPaymentSuccessful` (no-op if already done).
4. If the amount paid ≠ order total → mark payment `amount_mismatch`, alert owner, don't confirm.
5. Unpaid orders older than 24h are hidden from the default admin view (filter to show).

When adding crypto later (notes for that phase):
- Pick a provider at integration time (e.g. NOWPayments, Cryptomus, Binance Pay) and
  confirm current Nigerian SEC rules for accepting digital assets.
- Lock the NGN→crypto rate when the invoice is created and store it (`exchange_rate`,
  `crypto_currency`, `crypto_amount` on `payments`).
- Handle `partially_paid`, `overpaid`, `expired` statuses; confirmations can take minutes,
  so the confirmation page must show a "waiting for network confirmation" state.
- Use that provider's fee in its own gross-up (don't reuse Paystack's).

### 3.7 Notifications (all free)

**Customer (Brevo email)**
- Order confirmed: items + customisation, totals, motor park, pickup instructions,
  tracking link, support email and phone.
- Dispatched: logistics company name/phone and waybill note if the admin entered them.
- Delivered: thank-you + optional review/Instagram ask.

**Owner (Telegram bot + Brevo email copy)**
```
🛒 NEW ORDER #APW-1047
Customer: [Name]
Phone: [Phone]  Alt: [Alt phone]
Email: [Email]
Motor park: [Park], [City], [State]
─────────────────────────
[Jersey name] — [Size] × [Qty]
Custom: [NAME] | #[NUMBER] | Badge: [Badge]
─────────────────────────
Subtotal: ₦XX,XXX
Delivery (Zone X): ₦X,XXX
Voucher [CODE]: -₦X,XXX
Total paid: ₦XX,XXX ✅
Paystack ref: [reference]
Admin: [link to order]
```
Telegram: `POST https://api.telegram.org/bot<TOKEN>/sendMessage` with `chat_id` and
text. Notification failures are logged and never block payment confirmation.

Setup (owner): Telegram → @BotFather → `/newbot` → copy token. Send any message to the
new bot, then open `https://api.telegram.org/bot<TOKEN>/getUpdates` and copy
`message.chat.id`.

### 3.8 Vouchers
- Admin generates codes (custom or random, e.g. `APW-7KQ2`), uppercase, unique.
- Type: percent or fixed ₦; optional max discount for percent codes.
- Expiry date, max uses (1 for gift codes), minimum order value (items subtotal).
- Optional product restriction (`product_ids`): discount applies only to eligible items.
- Discount applies to items subtotal, never to delivery; never below ₦0.
- `/api/vouchers/validate` previews the discount; the real check happens again inside
  `/api/checkout`. Redemption happens in `redeem_voucher()` (Postgres function with row
  lock) at payment confirmation, so two people can't use a single-use code at once. If a
  paid order's voucher became exhausted in the meantime, honour it and flag it for the owner.
- Admin sees: uses, revenue generated, orders that used it.

### 3.9 Newsletter
- Footer form: first name + email. Checkout checkbox (unchecked by default).
- Stored in `newsletter_subscribers`, then synced to a Brevo list (`BREVO_LIST_ID`)
  via the Contacts API. Sync failures are retried from admin ("Sync to Brevo" button).
- Campaigns are sent from the Brevo dashboard.

### 3.10 Floating WhatsApp chat button (free)
- Fixed bottom-right on every store page (not admin), green WhatsApp icon, 56px circle,
  sits above the mobile sticky "Add to cart" bar so they never overlap.
- It's a plain link: `https://wa.me/${NEXT_PUBLIC_WHATSAPP_CHAT_NUMBER}?text=` +
  `encodeURIComponent("Hi, I need help with an order on Amioprowears")`. No API, no cost.
  Opens the WhatsApp app on phones and WhatsApp Web on desktop.
- On a product page, pre-fill the jersey name ("Hi, I have a question about [Jersey name]").
- Opens in a new tab with `rel="noopener noreferrer"` and an accessible label ("Chat with us on WhatsApp").
- Also shown on the Contact page and in the order confirmation email.
- Number format: country code, no plus, no leading zero (0803 123 4567 → `2348031234567`).

### 3.11 Admin
- Login: Supabase Auth email + password. Access only if the user is in `admin_users`.
- **Orders:** list with filters (status, date, paid/unpaid), search by order number /
  phone / name; detail view; status updates Pending → Processing → Dispatched →
  Delivered (or Cancelled) with optional logistics name/phone/note; each status change
  can email the customer. Printable waybill slip (name, phone, park, city, state, items).
- **Products:** add/edit, upload front/back/gallery images (browser-compressed WebP),
  "You receive" → customer price helper, sale price, sizes + out-of-stock sizes,
  filters, collections, allowed badges, customiser positions with live preview, active toggle. Bulk price update.
- **Badges:** name, image (transparent PNG/WebP), price (with net helper), position.
- **Vouchers:** generator, list, usage.
- **Newsletter:** list, CSV export, Brevo sync status.
- **Analytics:** orders and revenue today / this week / this month, estimated Paystack
  fees and net, top-selling jerseys, orders by state/zone, voucher usage.
- **Settings:** name+number fee, store open/closed (closed = browse only, checkout
  disabled with a message), announcement bar text.

### 3.12 Post-launch (not in MVP)
- Customer accounts via Supabase email magic link (free) — order history, faster
  checkout, wishlist, voucher wallet. Phone OTP needs a paid SMS provider, so skip it.
- Crypto payments (see 3.6).
- Reviews, size guide per product, low-stock alerts.

---

## 4. Database (Supabase / Postgres)

All money columns are `integer` naira. All tables have RLS enabled.

```sql
create extension if not exists pgcrypto;

-- Admins
create table admin_users (
  user_id uuid primary key references auth.users on delete cascade,
  created_at timestamptz not null default now()
);
create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from admin_users where user_id = auth.uid());
$$;

-- Store settings (single row, id = 1)
create table settings (
  id int primary key default 1 check (id = 1),
  name_number_fee int not null default 550,
  store_open boolean not null default true,
  announcement text,
  updated_at timestamptz not null default now()
);

create table products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  club text not null,
  gender text not null check (gender in ('male','female','kids')),
  type text not null check (type in ('player','fan')),
  era text not null check (era in ('current','vintage')),
  season text,                                   -- e.g. '2025/26'
  collections text[] not null default '{}',      -- new-arrivals | super-eagles | champions-league | female-kits | vintage
  sizes text[] not null default '{S,M,L,XL,XXL}',
  out_of_stock_sizes text[] not null default '{}',
  price int not null check (price > 0),          -- customer price (fee-inclusive)
  sale_price int check (sale_price > 0),
  image_front text not null,
  image_back text,
  gallery text[] not null default '{}',
  allow_name_number boolean not null default true,
  customizer jsonb not null default '{}',
  is_active boolean not null default true,
  is_featured boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table badges (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  image_url text not null,
  price int not null default 0,
  position text not null default 'left_chest' check (position in ('left_chest','right_chest','sleeve')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table product_badges (
  product_id uuid references products on delete cascade,
  badge_id uuid references badges on delete cascade,
  primary key (product_id, badge_id)
);

create sequence order_number_seq start 1001;

create table orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default ('APW-' || nextval('order_number_seq')),
  customer_name text not null,
  phone text not null,
  alt_phone text,
  email text not null,
  state text not null,
  city text not null,
  motor_park text not null,
  delivery_zone text not null check (delivery_zone in ('A','B','C')),
  delivery_fee int not null,
  subtotal int not null,
  discount int not null default 0,
  total int not null,
  voucher_id uuid references vouchers,  -- create vouchers table first in the migration
  voucher_code text,
  status text not null default 'pending'
    check (status in ('pending','processing','dispatched','delivered','cancelled')),
  payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid','paid','failed','amount_mismatch','refunded')),
  payment_provider text not null default 'paystack',
  notes text,
  newsletter_opt_in boolean not null default false,
  logistics_name text,
  logistics_phone text,
  dispatch_note text,
  paid_at timestamptz,
  notified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders on delete cascade,
  product_id uuid references products,
  product_name text not null,           -- snapshot
  size text not null,
  custom_name text,
  custom_number text,
  badge_id uuid references badges,
  badge_name text,                      -- snapshot
  unit_price int not null,              -- snapshot of jersey price used
  customization_fee int not null default 0,
  badge_price int not null default 0,
  quantity int not null check (quantity between 1 and 20),
  item_total int not null
);

create table payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders on delete cascade,
  provider text not null,                -- paystack | crypto
  reference text not null unique,
  amount int not null,                   -- naira expected
  amount_paid int,                       -- naira actually paid
  currency text not null default 'NGN',
  status text not null default 'initialized'
    check (status in ('initialized','success','failed','abandoned','amount_mismatch','pending')),
  provider_fee int,
  crypto_currency text,                  -- reserved for crypto
  crypto_amount numeric,
  exchange_rate numeric,
  raw jsonb,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz
);

create table vouchers (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code = upper(code)),
  discount_type text not null check (discount_type in ('percent','fixed')),
  discount_value int not null check (discount_value > 0),
  max_discount int,
  min_order_value int not null default 0,
  max_uses int not null default 1,
  used_count int not null default 0,
  product_ids uuid[],                    -- null = all products
  expires_at timestamptz,
  is_active boolean not null default true,
  note text,                             -- e.g. 'Influencer: @name'
  created_at timestamptz not null default now()
);

create table voucher_redemptions (
  voucher_id uuid references vouchers,
  order_id uuid references orders unique,
  redeemed_at timestamptz not null default now(),
  primary key (voucher_id, order_id)
);

-- Atomic redemption; returns false if exhausted/expired/inactive.
create or replace function redeem_voucher(p_voucher_id uuid, p_order_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare v vouchers;
begin
  select * into v from vouchers where id = p_voucher_id for update;
  if not found or not v.is_active or v.used_count >= v.max_uses
     or (v.expires_at is not null and v.expires_at < now()) then
    return false;
  end if;
  insert into voucher_redemptions (voucher_id, order_id) values (p_voucher_id, p_order_id)
    on conflict do nothing;
  if found then
    update vouchers set used_count = used_count + 1 where id = p_voucher_id;
  end if;
  return true;
end $$;

create table newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  first_name text,
  source text not null check (source in ('footer','checkout')),
  is_active boolean not null default true,
  brevo_synced boolean not null default false,
  subscribed_at timestamptz not null default now()
);
```

Notes for the migration author (Claude Code): create tables in dependency order
(`vouchers` before `orders`); add `updated_at` triggers; add indexes on
`orders(created_at)`, `orders(status)`, `orders(phone)`, `payments(order_id)`,
`products(is_active)`, `products using gin(collections)`.

**RLS policies**
- `products`, `badges`, `product_badges`: anon/auth `select` where active; admin all.
- `settings`: anon `select`; admin `update`.
- `orders`, `order_items`, `payments`, `vouchers`, `voucher_redemptions`,
  `newsletter_subscribers`: no anon access; admin `select/update`; inserts done by the
  server with the service role.
- `admin_users`: admin `select` only; rows added manually in the Supabase SQL editor.

**Storage buckets:** `product-images` (public read, admin write), `badge-images`
(public read, admin write).

---

## 5. Folder structure

```
amioprowears/
├── CLAUDE.md
├── docs/SPEC.md
├── app/
│   ├── (store)/
│   │   ├── layout.tsx                 header, footer, announcement bar, chat button
│   │   ├── page.tsx
│   │   ├── catalogue/page.tsx
│   │   ├── jersey/[slug]/page.tsx
│   │   ├── cart/page.tsx
│   │   ├── checkout/page.tsx
│   │   ├── order-confirmation/[id]/page.tsx
│   │   ├── track/page.tsx
│   │   └── (info)/about|contact|delivery|returns|privacy|terms/page.tsx
│   ├── (admin)/admin/
│   │   ├── layout.tsx                 server-side is_admin() guard
│   │   ├── login/page.tsx
│   │   ├── page.tsx
│   │   ├── orders/  products/  badges/  vouchers/  newsletter/  analytics/  settings/
│   └── api/
│       ├── checkout/route.ts
│       ├── payments/verify/route.ts
│       ├── payments/paystack/webhook/route.ts
│       ├── payments/crypto/webhook/route.ts
│       ├── vouchers/validate/route.ts
│       ├── newsletter/route.ts
│       └── track/route.ts
├── components/
│   ├── store/     JerseyCard, JerseyCustomizer, FilterSidebar, CartDrawer, ChatButton, NewsletterSignup, Header, Footer
│   ├── checkout/  CheckoutForm, OrderSummary, VoucherInput, PaymentMethodPicker
│   ├── admin/     OrdersTable, OrderDetail, ProductForm, NetPriceInput, CustomizerPositionEditor, VoucherGenerator, BulkPriceUpdate
│   └── ui/        Button, Input, Select, Sheet, Badge, Spinner
├── lib/
│   ├── supabase/  client.ts, server.ts, admin.ts
│   ├── payments/  types.ts, index.ts, confirm.ts, providers/paystack.ts, providers/crypto.ts
│   ├── notify/    telegram.ts, brevo.ts, templates/
│   ├── pricing.ts          fee gross-up + order total calculation
│   ├── delivery-zones.ts
│   ├── vouchers.ts
│   ├── validation.ts       zod schemas
│   └── format.ts           ₦ formatting, phone normalisation
├── store/cart.ts           Zustand cart
├── types/index.ts
├── supabase/migrations/    0001_schema.sql, 0002_rls.sql, 0003_seed.sql …
├── tests/                  pricing.test.ts, delivery-zones.test.ts, vouchers.test.ts
├── wrangler.jsonc
├── open-next.config.ts
├── .env.example
└── package.json
```

---

## 6. Environment variables

```bash
# Site
NEXT_PUBLIC_SITE_URL=https://amioprowears.com
NEXT_PUBLIC_STORE_NAME=Amioprowears
NEXT_PUBLIC_SUPPORT_EMAIL=support@amioprowears.com
NEXT_PUBLIC_SUPPORT_PHONE=
NEXT_PUBLIC_WHATSAPP_CHAT_NUMBER=234XXXXXXXXXX   # your WhatsApp, for the chat button

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=               # secret

# Paystack
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_…
PAYSTACK_SECRET_KEY=sk_test_…            # secret

# Crypto (future)
ENABLE_CRYPTO=false

# Brevo
BREVO_API_KEY=                           # secret
BREVO_SENDER_EMAIL=orders@amioprowears.com
BREVO_SENDER_NAME=Amioprowears
BREVO_LIST_ID=

# Owner alerts
TELEGRAM_BOT_TOKEN=                      # secret
TELEGRAM_CHAT_ID=
OWNER_EMAIL=admin@amioprowears.com
```

`NEXT_PUBLIC_*` values are baked in at build time, so they must also be set as build
variables in Cloudflare Workers Builds.

---

## 7. Build phases (each ends deployed and working)

### Phase 1 — Foundation
- Scaffold with the Cloudflare Next.js template (`npm create cloudflare@latest -- amioprowears --framework=next`) or add `@opennextjs/cloudflare` to a fresh Next app; TypeScript strict, Tailwind, ESLint, vitest, zod, zustand, `@supabase/ssr`.
- Fonts, colour tokens, base UI components.
- `lib/pricing.ts`, `lib/delivery-zones.ts`, `lib/format.ts` with passing tests.
- Migrations 0001–0003 (schema, RLS, seed: settings row, 3 badges, 6 sample products).
- Store layout: header (logo, catalogue, cart count), footer (links, newsletter form UI), optional chat button.
- `.env.example`, connect GitHub repo to Cloudflare Workers Builds, first deploy to the `*.workers.dev` URL.
- **Done when:** the site loads on the workers.dev URL on a phone, and `npm test` passes.

### Phase 2 — Catalogue and product pages
- Homepage with collections, catalogue with URL filters + sort, product page with gallery, sizes, price/sale price.
- **Done when:** filters combine correctly and survive refresh/back; pages are statically generated.

### Phase 3 — Customiser
- Overlay preview, front/back toggle, name/number/badge inputs with validation, live price, sticky mobile preview, "Add to cart".
- **Done when:** customisation looks right on a real phone for at least 3 products.

### Phase 4 — Cart, checkout, Paystack
- Zustand cart, cart page + drawer, checkout form, delivery zone fee, voucher preview, `/api/checkout`, Paystack provider, verify route, webhook, `markPaymentSuccessful`, confirmation page, `/track`.
- Test with Paystack test cards: success, failed, closed tab before redirect (webhook must still confirm), tampered cart price (must be ignored), single-use voucher used twice.
- **Done when:** all five tests behave correctly.

### Phase 5 — Notifications and newsletter
- Brevo order email + status emails, Telegram + email owner alert, newsletter API + Brevo sync.
- **Done when:** a test order produces the customer email and the Telegram alert exactly once, even if verify and webhook both fire.

### Phase 6 — Admin
- Login + guard, orders (list, detail, status, waybill print), products (with net-price helper, image upload, customiser position editor, bulk price), badges, vouchers, newsletter, analytics, settings.
- **Done when:** the owner can add a new jersey from a phone and fulfil an order end to end without touching Supabase directly.

### Phase 7 — Launch
- Policy pages (privacy under Nigeria Data Protection Act 2023, terms, returns/exchanges, delivery), SEO metadata, OG images, sitemap, robots, 404/500 pages.
- Mobile audit (375px), Lighthouse check, image sizes.
- Domain: move DNS to Cloudflare (free), attach custom domain to the Worker, Zoho MX/SPF/DKIM records, Brevo sender domain authentication (SPF/DKIM/DMARC) so emails don't land in spam.
- Paystack: set live webhook URL, switch to live keys, place one real order and refund it.
- **Done when:** a real order on the live domain works end to end.
