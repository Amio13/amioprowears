-- 0001_schema.sql — Amioprowears core schema.
-- All money columns are integer naira. RLS is enabled in 0002_rls.sql.
-- Never edit this file after it has been applied: add a new numbered migration instead.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- Admins
-- ---------------------------------------------------------------------------

create table public.admin_users (
  user_id uuid primary key references auth.users on delete cascade,
  created_at timestamptz not null default now()
);

-- security definer: reads admin_users without being blocked by its own RLS.
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid());
$$;

-- ---------------------------------------------------------------------------
-- Store settings (single row, id = 1)
-- ---------------------------------------------------------------------------

create table public.settings (
  id int primary key default 1 check (id = 1),
  name_number_fee int not null default 550 check (name_number_fee >= 0),
  store_open boolean not null default true,
  announcement text,
  updated_at timestamptz not null default now()
);

create trigger settings_updated_at before update on public.settings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Catalogue
-- ---------------------------------------------------------------------------

create table public.products (
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

create trigger products_updated_at before update on public.products
  for each row execute function public.set_updated_at();

create index products_is_active_idx on public.products (is_active);
create index products_collections_idx on public.products using gin (collections);

create table public.badges (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  image_url text not null,
  price int not null default 0 check (price >= 0),
  position text not null default 'left_chest'
    check (position in ('left_chest','right_chest','sleeve')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.product_badges (
  product_id uuid references public.products on delete cascade,
  badge_id uuid references public.badges on delete cascade,
  primary key (product_id, badge_id)
);

create index product_badges_badge_id_idx on public.product_badges (badge_id);

-- ---------------------------------------------------------------------------
-- Vouchers (before orders: orders references vouchers)
-- ---------------------------------------------------------------------------

create table public.vouchers (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code = upper(code)),
  discount_type text not null check (discount_type in ('percent','fixed')),
  discount_value int not null check (discount_value > 0),
  max_discount int check (max_discount > 0),
  min_order_value int not null default 0 check (min_order_value >= 0),
  max_uses int not null default 1 check (max_uses > 0),
  used_count int not null default 0 check (used_count >= 0),
  product_ids uuid[],                    -- null = all products
  expires_at timestamptz,
  is_active boolean not null default true,
  note text,                             -- e.g. 'Influencer: @name'
  created_at timestamptz not null default now(),
  check (discount_type <> 'percent' or discount_value <= 100)
);

-- ---------------------------------------------------------------------------
-- Orders
-- ---------------------------------------------------------------------------

create sequence public.order_number_seq start 1001;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default ('APW-' || nextval('public.order_number_seq')),
  customer_name text not null,
  phone text not null,                   -- 234XXXXXXXXXX
  alt_phone text,
  email text not null,
  state text not null,
  city text not null,
  motor_park text not null,
  delivery_zone text not null check (delivery_zone in ('A','B','C')),
  delivery_fee int not null check (delivery_fee >= 0),
  subtotal int not null check (subtotal >= 0),
  discount int not null default 0 check (discount >= 0),
  total int not null check (total >= 0),
  voucher_id uuid references public.vouchers,
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
  notified_at timestamptz,               -- set once notifications are sent (idempotency)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger orders_updated_at before update on public.orders
  for each row execute function public.set_updated_at();

create index orders_created_at_idx on public.orders (created_at);
create index orders_status_idx on public.orders (status);
create index orders_phone_idx on public.orders (phone);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders on delete cascade,
  product_id uuid references public.products,
  product_name text not null,           -- snapshot
  size text not null,
  custom_name text,
  custom_number text,
  badge_id uuid references public.badges,
  badge_name text,                      -- snapshot
  unit_price int not null,              -- snapshot of jersey price used
  customization_fee int not null default 0,
  badge_price int not null default 0,
  quantity int not null check (quantity between 1 and 20),
  item_total int not null
);

create index order_items_order_id_idx on public.order_items (order_id);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders on delete cascade,
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

create index payments_order_id_idx on public.payments (order_id);

create table public.voucher_redemptions (
  voucher_id uuid references public.vouchers,
  order_id uuid references public.orders unique,
  redeemed_at timestamptz not null default now(),
  primary key (voucher_id, order_id)
);

-- Atomic redemption (row lock), called at payment confirmation.
-- Returns true if this order holds a redemption, false if exhausted/expired/inactive.
-- Idempotent: calling it again for the same order returns true without counting twice.
create or replace function public.redeem_voucher(p_voucher_id uuid, p_order_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare v public.vouchers;
begin
  select * into v from public.vouchers where id = p_voucher_id for update;
  if not found then
    return false;
  end if;

  if exists (select 1 from public.voucher_redemptions
             where voucher_id = p_voucher_id and order_id = p_order_id) then
    return true;
  end if;

  if not v.is_active or v.used_count >= v.max_uses
     or (v.expires_at is not null and v.expires_at < now()) then
    return false;
  end if;

  insert into public.voucher_redemptions (voucher_id, order_id)
    values (p_voucher_id, p_order_id)
    on conflict do nothing;
  if found then
    update public.vouchers set used_count = used_count + 1 where id = p_voucher_id;
    return true;
  end if;
  return false;  -- this order already redeemed a different voucher
end $$;

-- ---------------------------------------------------------------------------
-- Newsletter
-- ---------------------------------------------------------------------------

create table public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  first_name text,
  source text not null check (source in ('footer','checkout')),
  is_active boolean not null default true,
  brevo_synced boolean not null default false,
  subscribed_at timestamptz not null default now()
);
