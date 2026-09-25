import type { Metadata } from "next";
import { connection } from "next/server";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import { NIGERIAN_STATES } from "@/lib/delivery-zones";
import { getEnabledProviders } from "@/lib/payments";
import { getStoreSettings } from "@/lib/products";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default async function CheckoutPage() {
  // Rendered per request: payment providers depend on runtime secrets, and the
  // store open/closed switch should apply immediately.
  await connection();
  const settings = await getStoreSettings();
  const providers = getEnabledProviders().map((p) => ({ id: p.id, label: p.label }));

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:py-10">
      <h1 className="mb-6 font-display text-5xl leading-none tracking-wide">Checkout</h1>
      <CheckoutForm states={NIGERIAN_STATES} providers={providers} storeOpen={settings.store_open} />
    </div>
  );
}
