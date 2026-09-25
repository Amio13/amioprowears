-- 0002_rls.sql — Row Level Security, function permissions and storage buckets.
-- Public (anon) may only read active products/badges and settings.
-- Orders, payments, vouchers, subscribers: service role (server) or admin only.
-- The service role key bypasses RLS, so server-side inserts need no policies.

alter table public.admin_users            enable row level security;
alter table public.settings               enable row level security;
alter table public.products               enable row level security;
alter table public.badges                 enable row level security;
alter table public.product_badges         enable row level security;
alter table public.vouchers               enable row level security;
alter table public.orders                 enable row level security;
alter table public.order_items            enable row level security;
alter table public.payments               enable row level security;
alter table public.voucher_redemptions    enable row level security;
alter table public.newsletter_subscribers enable row level security;

-- ---------------------------------------------------------------------------
-- Function permissions. Postgres lets PUBLIC execute functions by default, and
-- Supabase exposes them over the API. Only the server may redeem vouchers.
-- ---------------------------------------------------------------------------

revoke execute on function public.redeem_voucher(uuid, uuid) from public, anon, authenticated;
grant execute on function public.redeem_voucher(uuid, uuid) to service_role;

revoke execute on function public.set_updated_at() from public, anon, authenticated;

-- Orders are created by the server only; don't let API users burn order numbers.
revoke all on sequence public.order_number_seq from anon, authenticated;

-- ---------------------------------------------------------------------------
-- admin_users: admins can see the list; rows are added in the SQL editor.
-- ---------------------------------------------------------------------------

create policy "Admins read admin_users" on public.admin_users
  for select to authenticated using (public.is_admin());

-- ---------------------------------------------------------------------------
-- settings: everyone reads, admins update.
-- ---------------------------------------------------------------------------

create policy "Anyone reads settings" on public.settings
  for select to anon, authenticated using (true);

create policy "Admins update settings" on public.settings
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Catalogue: public reads active rows; admins do everything.
-- ---------------------------------------------------------------------------

create policy "Read active products" on public.products
  for select to anon, authenticated using (is_active or public.is_admin());
create policy "Admins insert products" on public.products
  for insert to authenticated with check (public.is_admin());
create policy "Admins update products" on public.products
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins delete products" on public.products
  for delete to authenticated using (public.is_admin());

create policy "Read active badges" on public.badges
  for select to anon, authenticated using (is_active or public.is_admin());
create policy "Admins insert badges" on public.badges
  for insert to authenticated with check (public.is_admin());
create policy "Admins update badges" on public.badges
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins delete badges" on public.badges
  for delete to authenticated using (public.is_admin());

create policy "Read links between active products and badges" on public.product_badges
  for select to anon, authenticated using (
    public.is_admin() or (
      exists (select 1 from public.products p where p.id = product_id and p.is_active)
      and exists (select 1 from public.badges b where b.id = badge_id and b.is_active)
    )
  );
create policy "Admins insert product_badges" on public.product_badges
  for insert to authenticated with check (public.is_admin());
create policy "Admins delete product_badges" on public.product_badges
  for delete to authenticated using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Private tables: no anon access. Admins read/update; the server (service role)
-- inserts. Admins may also create vouchers (the voucher generator).
-- ---------------------------------------------------------------------------

create policy "Admins read orders" on public.orders
  for select to authenticated using (public.is_admin());
create policy "Admins update orders" on public.orders
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Admins read order_items" on public.order_items
  for select to authenticated using (public.is_admin());
create policy "Admins update order_items" on public.order_items
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Admins read payments" on public.payments
  for select to authenticated using (public.is_admin());
create policy "Admins update payments" on public.payments
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Admins read vouchers" on public.vouchers
  for select to authenticated using (public.is_admin());
create policy "Admins insert vouchers" on public.vouchers
  for insert to authenticated with check (public.is_admin());
create policy "Admins update vouchers" on public.vouchers
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Admins read voucher_redemptions" on public.voucher_redemptions
  for select to authenticated using (public.is_admin());

create policy "Admins read newsletter_subscribers" on public.newsletter_subscribers
  for select to authenticated using (public.is_admin());
create policy "Admins update newsletter_subscribers" on public.newsletter_subscribers
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Storage: public-read buckets, admin-only writes. Files are served by public
-- URL, so no select policy is needed (and none means nobody can list files).
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('product-images', 'product-images', true, 5242880, array['image/webp','image/png','image/jpeg']),
  ('badge-images',   'badge-images',   true, 2097152, array['image/webp','image/png'])
on conflict (id) do nothing;

create policy "Admins upload store images" on storage.objects
  for insert to authenticated
  with check (bucket_id in ('product-images','badge-images') and public.is_admin());
create policy "Admins update store images" on storage.objects
  for update to authenticated
  using (bucket_id in ('product-images','badge-images') and public.is_admin())
  with check (bucket_id in ('product-images','badge-images') and public.is_admin());
create policy "Admins delete store images" on storage.objects
  for delete to authenticated
  using (bucket_id in ('product-images','badge-images') and public.is_admin());
