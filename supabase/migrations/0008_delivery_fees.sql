-- 0008_delivery_fees.sql — delivery fee per zone, editable in admin → Settings.
-- Customer prices (fee-inclusive, integer naira), like name_number_fee. Which states
-- belong to which zone stays in code (lib/delivery-zones.ts).
-- Defaults = owner receives ₦2,000 / ₦3,000 / ₦4,000 after Paystack's 1.5%.

alter table public.settings
  add column if not exists delivery_fee_a int not null default 2050 check (delivery_fee_a >= 0),
  add column if not exists delivery_fee_b int not null default 3050 check (delivery_fee_b >= 0),
  add column if not exists delivery_fee_c int not null default 4100 check (delivery_fee_c >= 0);
