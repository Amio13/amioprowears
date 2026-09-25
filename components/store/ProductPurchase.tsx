"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { useCart } from "@/store/cart";
import { Price } from "./Price";

/**
 * Size picker + "Add to cart" (plain jersey). On phones the button lives in a
 * sticky bar at the bottom of the screen. The customiser joins this in Phase 3.
 */
export function ProductPurchase({
  productId,
  sizes,
  outOfStockSizes,
  price,
  salePrice,
}: {
  productId: string;
  sizes: string[];
  outOfStockSizes: string[];
  price: number;
  salePrice: number | null;
}) {
  const inStock = sizes.filter((s) => !outOfStockSizes.includes(s));
  const [size, setSize] = useState<string | null>(inStock.length === 1 ? inStock[0]! : null);
  const [message, setMessage] = useState<{ tone: "error" | "ok"; text: string } | null>(null);
  const add = useCart((s) => s.add);
  const soldOut = inStock.length === 0;

  function addToCart() {
    if (!size) {
      setMessage({ tone: "error", text: "Choose a size first." });
      document.getElementById("size-picker")?.scrollIntoView({ block: "center" });
      return;
    }
    add({ productId, size });
    setMessage({ tone: "ok", text: `Added size ${size} to your cart.` });
  }

  const button = (
    <Button size="lg" onClick={addToCart} disabled={soldOut} className="w-full">
      {soldOut ? "Sold out" : "Add to cart"}
    </Button>
  );

  return (
    <div className="space-y-4">
      <fieldset id="size-picker" className="scroll-mt-24">
        <legend className="mb-2 flex w-full justify-between text-sm font-bold">
          Size
          {size && <span className="font-normal text-muted">Selected: {size}</span>}
        </legend>
        <div className="grid grid-cols-5 gap-2">
          {sizes.map((s) => {
            const unavailable = outOfStockSizes.includes(s);
            return (
              <label key={s} className={cn(unavailable ? "cursor-not-allowed" : "cursor-pointer")}>
                <input
                  type="radio"
                  name="size"
                  value={s}
                  checked={size === s}
                  disabled={unavailable}
                  onChange={() => {
                    setSize(s);
                    setMessage(null);
                  }}
                  className="peer sr-only"
                />
                <span
                  className={cn(
                    "flex min-h-12 items-center justify-center rounded-lg border px-1 text-sm font-medium",
                    "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand",
                    unavailable
                      ? "border-line bg-surface text-neutral-400 line-through"
                      : size === s
                        ? "border-ink bg-ink text-white"
                        : "border-line hover:border-ink",
                  )}
                >
                  {s}
                  {unavailable && <span className="sr-only"> (sold out)</span>}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <p
        role={message?.tone === "error" ? "alert" : "status"}
        className={cn("min-h-5 text-sm", message?.tone === "error" ? "text-brand" : "text-green-700")}
      >
        {message?.text}
      </p>

      {/* Desktop: inline button */}
      <div className="hidden md:block">{button}</div>

      {/* Mobile: sticky bar. globals.css reserves room for it below the footer. */}
      <div
        data-sticky-bar
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 md:hidden"
      >
        <div className="flex items-center gap-3">
          <Price price={price} salePrice={salePrice} className="shrink-0 flex-col gap-0 leading-tight" />
          {button}
        </div>
      </div>
    </div>
  );
}
