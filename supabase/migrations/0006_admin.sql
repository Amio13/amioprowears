-- 0006_admin.sql — what the admin panel (Phase 6) needs on top of 0001–0005.
--
-- admin_set_product_prices(): bulk price update in ONE request. Updating products
-- one by one would need one request each, and the Workers Free plan allows only 50
-- outgoing requests per page load. SECURITY INVOKER, so the normal RLS policies
-- apply too (only admins can update products); the is_admin() check gives a clear
-- error instead of silently updating nothing.
--
-- p_updates: [{"id": "<uuid>", "price": 16350, "sale_price": null}, ...]

create or replace function public.admin_set_product_prices(p_updates jsonb)
returns integer
language plpgsql security invoker set search_path = public as $$
declare
  n integer;
begin
  if not public.is_admin() then
    raise exception 'Only admins can change prices';
  end if;

  update public.products p
     set price = u.price,
         sale_price = u.sale_price
    from jsonb_to_recordset(p_updates) as u(id uuid, price int, sale_price int)
   where p.id = u.id;

  get diagnostics n = row_count;
  return n;
end $$;

revoke execute on function public.admin_set_product_prices(jsonb) from public, anon;
grant execute on function public.admin_set_product_prices(jsonb) to authenticated;
