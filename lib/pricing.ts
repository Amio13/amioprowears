/**
 * Paystack fee gross-up. The owner enters what they want to RECEIVE (net);
 * these functions give the customer price that covers Paystack's fee.
 * All amounts are integer naira. See docs/SPEC.md → 3.3 Pricing.
 */

/** Paystack local card fee: 1.5% + ₦100 (₦100 waived under ₦2,500), capped at ₦2,000. */
export const PAYSTACK_FEE = { pct: 0.015, flat: 100, flatThreshold: 2500, cap: 2000 };

/**
 * Round UP to the nearest `step` naira. Rounds to kobo first so floating-point
 * noise (e.g. 200.00000000000003) doesn't push a price up a whole step.
 */
export const roundUpTo = (n: number, step = 50) =>
  Math.ceil(Math.round(n * 100) / 100 / step) * step;

/** Jersey price: carries the ₦100 flat fee once per order (every order has ≥1 jersey). */
export function grossUpJersey(net: number): number {
  const { pct, flat, cap } = PAYSTACK_FEE;
  return roundUpTo(Math.min((net + flat) / (1 - pct), net + cap));
}

/** Add-ons (name/number, badges) and delivery: carry only the percentage fee. */
export function grossUpAddon(net: number): number {
  return roundUpTo(net / (1 - PAYSTACK_FEE.pct));
}

/** Exact fee Paystack will charge on a total (for reports/analytics). May include kobo. */
export function paystackFee(total: number): number {
  const { pct, flat, flatThreshold, cap } = PAYSTACK_FEE;
  return Math.min(total * pct + (total >= flatThreshold ? flat : 0), cap);
}

/** The price a customer pays for a product: sale price if set and lower, else price. */
export function effectivePrice(p: { price: number; sale_price: number | null }): number {
  return p.sale_price !== null && p.sale_price < p.price ? p.sale_price : p.price;
}

/**
 * Price of ONE jersey with its customisation. The name/number fee is charged once
 * if either a name or a number is printed. Used for the live price on the product
 * page and (with values from the DB) to recalculate every line at checkout.
 */
export function lineUnitPrice({
  product,
  nameNumberFee,
  hasNameOrNumber,
  badgePrice = 0,
}: {
  product: { price: number; sale_price: number | null };
  nameNumberFee: number;
  hasNameOrNumber: boolean;
  badgePrice?: number;
}): number {
  return effectivePrice(product) + (hasNameOrNumber ? nameNumberFee : 0) + badgePrice;
}
