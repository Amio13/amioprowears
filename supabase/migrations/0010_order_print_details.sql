-- 0010_order_print_details.sql — several badges per jersey + what to print, per order item.
--
-- order_items.badges      every badge chosen: [{id, name, price, image_url}] (snapshot).
--                         badge_id keeps the first one and badge_name all names joined
--                         with " + ", so emails, tracking and older orders still work.
-- order_items.print_style font, curve, colour and positions used for the name/number at
--                         checkout (lib/customizer.ts → printSnapshot), so the admin order
--                         page can redraw exactly what the customer saw.
--
-- Safe with the code before or after this change: create_order() only reads keys it knows.

alter table public.order_items
  add column if not exists badges jsonb not null default '[]'::jsonb,
  add column if not exists print_style jsonb;

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
    badge_id, badge_name, badges, print_style,
    unit_price, customization_fee, badge_price, quantity, item_total
  )
  select
    o.id, i.product_id, i.product_name, i.size, i.custom_name, i.custom_number,
    i.badge_id, i.badge_name, coalesce(i.badges, '[]'::jsonb), i.print_style,
    i.unit_price, i.customization_fee, i.badge_price, i.quantity, i.item_total
  from jsonb_populate_recordset(null::public.order_items, p_items) as i;

  return query select o.id, o.order_number;
end $$;

revoke execute on function public.create_order(jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.create_order(jsonb, jsonb) to service_role;
