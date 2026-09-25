import type { Metadata } from "next";
import { CartContents } from "@/components/cart/CartContents";

export const metadata: Metadata = { title: "Your cart", robots: { index: false } };

/** Static shell; the cart lives in the browser and prices come from /api/cart/quote. */
export default function CartPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:py-10">
      <h1 className="mb-6 font-display text-5xl leading-none tracking-wide">Your cart</h1>
      <CartContents variant="page" />
    </div>
  );
}
