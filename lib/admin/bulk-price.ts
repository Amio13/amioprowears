/**
 * Bulk price update rules (admin → Products → Bulk price). Pure functions so the
 * preview in the browser and the real update on the server give the same numbers.
 * See docs/SPEC.md → 3.3 Pricing → "Bulk update".
 */
import { grossUpJersey, roundUpTo } from "@/lib/pricing";

export type BulkPriceOp =
  | { kind: "amount"; amount: number } //  +/- ₦X
  | { kind: "percent"; percent: number } // +/- X%
  | { kind: "set-net"; net: number }; //   "I want to receive ₦X" → customer price via grossUpJersey

export const MIN_PRICE = 50;

/** New customer price for one product, re-rounded up to ₦50. Never below ₦50. */
export function applyBulkOp(price: number, op: BulkPriceOp): number {
  let next: number;
  switch (op.kind) {
    case "amount":
      next = roundUpTo(price + op.amount);
      break;
    case "percent":
      next = roundUpTo(price * (1 + op.percent / 100));
      break;
    case "set-net":
      next = grossUpJersey(op.net);
      break;
  }
  return Math.max(MIN_PRICE, next);
}

export interface BulkPriceChange {
  id: string;
  price: number;
  sale_price: number | null;
}

/**
 * Price + sale price after the operation. Sale prices change only for +/- ₦ or %
 * (and only if `alsoSale`); a sale price that ends up not below the new price is
 * removed, because it would no longer be a sale.
 */
export function planBulkChange(
  product: { id: string; price: number; sale_price: number | null },
  op: BulkPriceOp,
  alsoSale: boolean,
): BulkPriceChange {
  const price = applyBulkOp(product.price, op);
  let sale = product.sale_price;
  if (sale !== null && alsoSale && op.kind !== "set-net") sale = applyBulkOp(sale, op);
  if (sale !== null && sale >= price) sale = null;
  return { id: product.id, price, sale_price: sale };
}
