"use client";

import { CartLineItem } from "@/components/cart/CartLineItem";
import { formatNaira } from "@/lib/format";
import type { OrderQuote } from "@/lib/order-pricing";
import type { CartItem } from "@/store/cart";

/** Items with customisation, subtotal, delivery (zone), voucher discount, total. Prices from the server quote. */
export function OrderSummary({
  items,
  quote,
  loading,
}: {
  items: CartItem[];
  quote: OrderQuote | null;
  loading: boolean;
}) {
  const priced = new Map(quote?.lines.map((l) => [l.index, l]));
  const problems = new Map(quote?.problems.map((p) => [p.index, p.error]));

  return (
    <div className={loading ? "opacity-60 transition-opacity" : undefined} aria-busy={loading}>
      <ul className="divide-y divide-line">
        {items.map((item, i) => (
          <CartLineItem key={item.key} item={item} priced={priced.get(i)} problem={problems.get(i)} editable={false} compact />
        ))}
      </ul>
      <dl className="mt-2 space-y-2 border-t border-line pt-4 text-sm">
        <Row term="Subtotal" value={quote ? formatNaira(quote.subtotal) : "…"} />
        <Row
          term={quote?.delivery ? `Delivery (Zone ${quote.delivery.zone})` : "Delivery"}
          value={quote?.delivery ? formatNaira(quote.delivery.fee) : "Choose your state"}
          muted={!quote?.delivery}
        />
        {quote?.voucher?.ok && quote.discount > 0 && (
          <Row term={`Voucher ${quote.voucher.code}`} value={`-${formatNaira(quote.discount)}`} accent />
        )}
        <div className="flex justify-between border-t border-line pt-3 text-base font-bold">
          <dt>Total</dt>
          <dd>{quote ? formatNaira(quote.total) : "…"}</dd>
        </div>
      </dl>
    </div>
  );
}

function Row({ term, value, muted, accent }: { term: string; value: string; muted?: boolean; accent?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <dt>{term}</dt>
      <dd className={muted ? "text-muted" : accent ? "font-medium text-green-700" : undefined}>{value}</dd>
    </div>
  );
}
