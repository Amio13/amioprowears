"use client";

import { useEffect, useState } from "react";
import type { OrderQuote } from "@/lib/order-pricing";
import { toApiLines, type CartItem } from "@/store/cart";

interface QuoteState {
  quote: OrderQuote | null;
  loading: boolean;
  error: string | null;
}

/**
 * Live prices for the cart from the server (the cart itself stores no prices).
 * Re-fetches when items, state or voucher change; stale requests are cancelled.
 */
export function useCartQuote({
  items,
  state,
  voucherCode,
  enabled = true,
}: {
  items: CartItem[];
  state?: string;
  voucherCode?: string;
  enabled?: boolean;
}): QuoteState {
  const [result, setResult] = useState<QuoteState>({ quote: null, loading: false, error: null });
  const body = JSON.stringify({ lines: toApiLines(items), state: state || undefined, voucherCode });
  const active = enabled && items.length > 0;

  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    setResult((r) => ({ ...r, loading: true }));
    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/cart/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          signal: controller.signal,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "We couldn't load prices.");
        setResult({ quote: data as OrderQuote, loading: false, error: null });
      } catch (err) {
        if (controller.signal.aborted) return;
        setResult((r) => ({
          ...r,
          loading: false,
          error: err instanceof Error ? err.message : "We couldn't load prices. Check your connection.",
        }));
      }
    }, 150); // small debounce: quantity taps in quick succession make one request
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [body, active]);

  return active ? result : { quote: null, loading: false, error: null };
}
