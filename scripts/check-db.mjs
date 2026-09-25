// Sanity-check the Supabase project: keys work, migrations applied, RLS in place.
// Usage: npm run db:check   (reads .env.local)
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let failed = false;
const check = (ok, msg) => {
  console.log(`${ok ? "✓" : "✗"} ${msg}`);
  if (!ok) failed = true;
};

if (!url || !anonKey || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const anon = createClient(url, anonKey, { auth: { persistSession: false } });
const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

const settings = await anon.from("settings").select("*").single();
check(!settings.error && settings.data?.name_number_fee === 550,
  `public can read settings ${settings.error ? `(${settings.error.message})` : `(fee ₦${settings.data.name_number_fee})`}`);

const products = await anon.from("products").select("slug, price").eq("is_active", true);
check(!products.error && products.data.length >= 6,
  `public can read active products ${products.error ? `(${products.error.message})` : `(${products.data.length})`}`);

const badges = await anon.from("badges").select("id");
check(!badges.error && badges.data.length >= 3, `public can read badges (${badges.data?.length ?? badges.error?.message})`);

for (const table of ["orders", "payments", "vouchers", "newsletter_subscribers", "admin_users"]) {
  const r = await anon.from(table).select("*").limit(1);
  check(!r.error ? r.data.length === 0 : true, `public cannot read ${table}`);
}

const redeem = await anon.rpc("redeem_voucher", {
  p_voucher_id: "00000000-0000-4000-8000-000000000000",
  p_order_id: "00000000-0000-4000-8000-000000000000",
});
check(Boolean(redeem.error), "public cannot call redeem_voucher()");

const orders = await admin.from("orders").select("id", { count: "exact", head: true });
check(!orders.error, `service role can read orders ${orders.error ? `(${orders.error.message})` : ""}`);

const buckets = await admin.storage.listBuckets();
const names = (buckets.data ?? []).map((b) => b.name);
check(names.includes("product-images") && names.includes("badge-images"),
  `storage buckets exist (${names.join(", ") || buckets.error?.message})`);

console.log(failed ? "\nSome checks failed." : "\nAll good — Supabase is set up.");
process.exit(failed ? 1 : 0);
