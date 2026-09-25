import { describe, expect, it } from "vitest";
import { computeVoucherDiscount, normalizeVoucherCode, type VoucherRules } from "@/lib/vouchers";

const NOW = new Date("2026-09-25T12:00:00Z");
const voucher = (o: Partial<VoucherRules> = {}): VoucherRules => ({
  id: "v1",
  code: "APW-7KQ2",
  discount_type: "fixed",
  discount_value: 1000,
  max_discount: null,
  min_order_value: 0,
  max_uses: 1,
  used_count: 0,
  product_ids: null,
  expires_at: null,
  is_active: true,
  ...o,
});
const lines = [
  { productId: "a", lineTotal: 15900 },
  { productId: "b", lineTotal: 20450 },
];
const run = (v: VoucherRules | null, l = lines) => computeVoucherDiscount(v, l, NOW);

describe("computeVoucherDiscount", () => {
  it("fixed ₦ off the items subtotal", () => {
    expect(run(voucher())).toEqual({ ok: true, discount: 1000 });
  });

  it("percent, rounded down, with optional max discount", () => {
    expect(run(voucher({ discount_type: "percent", discount_value: 10 }))).toEqual({ ok: true, discount: 3635 });
    expect(run(voucher({ discount_type: "percent", discount_value: 10, max_discount: 2000 }))).toEqual({ ok: true, discount: 2000 });
  });

  it("never takes the total below ₦0", () => {
    expect(run(voucher({ discount_value: 999999 }))).toEqual({ ok: true, discount: 36350 });
  });

  it("product restriction: discount only on eligible items", () => {
    expect(run(voucher({ discount_type: "percent", discount_value: 50, product_ids: ["a"] }))).toEqual({ ok: true, discount: 7950 });
    expect(run(voucher({ discount_value: 50000, product_ids: ["a"] }))).toEqual({ ok: true, discount: 15900 });
    expect(run(voucher({ product_ids: ["zzz"] })).ok).toBe(false);
  });

  it("minimum order value is checked on the items subtotal", () => {
    expect(run(voucher({ min_order_value: 36350 })).ok).toBe(true);
    const r = run(voucher({ min_order_value: 40000 }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("₦40,000");
  });

  it("rejects unknown, inactive, expired and used-up codes", () => {
    expect(run(null)).toEqual({ ok: false, error: "That voucher code isn't valid." });
    expect(run(voucher({ is_active: false })).ok).toBe(false);
    expect(run(voucher({ expires_at: "2026-09-25T11:59:59Z" }))).toEqual({ ok: false, error: "That voucher has expired." });
    expect(run(voucher({ expires_at: "2026-09-25T12:00:01Z" })).ok).toBe(true);
    expect(run(voucher({ used_count: 1 }))).toEqual({ ok: false, error: "That voucher has already been used." });
    expect(run(voucher({ max_uses: 5, used_count: 4 })).ok).toBe(true);
  });

  it("normalizeVoucherCode", () => {
    expect(normalizeVoucherCode("  apw-7kq2 ")).toBe("APW-7KQ2");
    expect(normalizeVoucherCode("apw 7kq2")).toBe("APW7KQ2");
  });
});
