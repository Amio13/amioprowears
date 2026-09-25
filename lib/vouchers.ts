/**
 * Voucher rules (SPEC 3.8). Pure — no DB. The discount comes off the items
 * subtotal (only eligible items if the voucher is limited to some products),
 * never off delivery, and never takes a line below ₦0.
 *
 * This only PREVIEWS/checks a voucher. Redemption (counting a use) happens in the
 * redeem_voucher() Postgres function when payment is confirmed.
 */
import { formatNaira } from "./format";
import type { Voucher } from "@/types";

export type VoucherRules = Pick<
  Voucher,
  | "id"
  | "code"
  | "discount_type"
  | "discount_value"
  | "max_discount"
  | "min_order_value"
  | "max_uses"
  | "used_count"
  | "product_ids"
  | "expires_at"
  | "is_active"
>;

export const VOUCHER_COLUMNS =
  "id, code, discount_type, discount_value, max_discount, min_order_value, max_uses, used_count, product_ids, expires_at, is_active";

/** "  apw-7kq2 " → "APW-7KQ2" */
export function normalizeVoucherCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}

export type VoucherResult =
  | { ok: true; discount: number }
  | { ok: false; error: string };

/**
 * @param lines  priced cart lines: product and line total (integer naira)
 */
export function computeVoucherDiscount(
  voucher: VoucherRules | null,
  lines: { productId: string; lineTotal: number }[],
  now: Date = new Date(),
): VoucherResult {
  if (!voucher || !voucher.is_active) return { ok: false, error: "That voucher code isn't valid." };
  if (voucher.expires_at && new Date(voucher.expires_at) < now) {
    return { ok: false, error: "That voucher has expired." };
  }
  if (voucher.used_count >= voucher.max_uses) {
    return { ok: false, error: "That voucher has already been used." };
  }

  const subtotal = lines.reduce((n, l) => n + l.lineTotal, 0);
  if (subtotal < voucher.min_order_value) {
    return {
      ok: false,
      error: `This voucher needs an order of at least ${formatNaira(voucher.min_order_value)} (before delivery).`,
    };
  }

  const eligible = voucher.product_ids
    ? lines.filter((l) => voucher.product_ids!.includes(l.productId))
    : lines;
  const eligibleTotal = eligible.reduce((n, l) => n + l.lineTotal, 0);
  if (eligibleTotal === 0) {
    return { ok: false, error: "That voucher doesn't apply to the jerseys in your cart." };
  }

  let discount =
    voucher.discount_type === "percent"
      ? Math.floor((eligibleTotal * voucher.discount_value) / 100)
      : voucher.discount_value;
  if (voucher.discount_type === "percent" && voucher.max_discount !== null) {
    discount = Math.min(discount, voucher.max_discount);
  }
  discount = Math.min(discount, eligibleTotal); // never below ₦0

  return { ok: true, discount };
}
