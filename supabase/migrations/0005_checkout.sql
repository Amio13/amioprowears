-- 0005_checkout.sql — what checkout needs on top of 0001–0004.
--
-- 1. orders.attention_note: why the owner should look at an order (e.g. the
--    voucher ran out between checkout and payment but the order was honoured,
--    or the amount paid didn't match). Shown in the admin (Phase 6).
-- 2. create_order(): saves an order and its items in ONE transaction, so a
--    failure can never leave an order without items. Only the server (service
--    role) may call it; prices are computed by the server before calling.

alter table public.orders add column if not exists attention_note text;

create or replace function public.create_order(p_order jsonb, p_items jsonb)
returns table (id uuid, order_number text)
language plpgsql security definer set search_path = public as $$
declare
  o public.orders;
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'An order needs at least one item';
  end if;

  insert into public.orders (
    customer_name, phone, alt_phone, email, state, city, motor_park,
    delivery_zone, delivery_fee, subtotal, discount, total,
    voucher_id, voucher_code, payment_provider, notes, newsletter_opt_in
  )
  select
    r.customer_name, r.phone, r.alt_phone, r.email, r.state, r.city, r.motor_park,
    r.delivery_zone, r.delivery_fee, r.subtotal, r.discount, r.total,
    r.voucher_id, r.voucher_code, coalesce(r.payment_provider, 'paystack'), r.notes,
    coalesce(r.newsletter_opt_in, false)
  from jsonb_populate_record(null::public.orders, p_order) as r
  returning * into o;

  insert into public.order_items (
    order_id, product_id, product_name, size, custom_name, custom_number,
    badge_id, badge_name, unit_price, customization_fee, badge_price, quantity, item_total
  )
  select
    o.id, i.product_id, i.product_name, i.size, i.custom_name, i.custom_number,
    i.badge_id, i.badge_name, i.unit_price, i.customization_fee, i.badge_price, i.quantity, i.item_total
  from jsonb_populate_recordset(null::public.order_items, p_items) as i;

  return query select o.id, o.order_number;
end $$;

revoke execute on function public.create_order(jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.create_order(jsonb, jsonb) to service_role;
