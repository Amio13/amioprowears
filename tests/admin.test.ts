import { describe, expect, it } from "vitest";
import { breakdown, periodStart, totals, type AnalyticsOrder } from "@/lib/admin/analytics";
import { applyBulkOp, planBulkChange } from "@/lib/admin/bulk-price";
import { csvCell, toCsv } from "@/lib/admin/csv";
import { productInputSchema, voucherInputSchema, orderUpdateSchema } from "@/lib/admin/schemas";
import { randomVoucherCode, randomVoucherCodes } from "@/lib/admin/voucher-code";
import { formatDateTime, lagosDay, lagosDayStart } from "@/lib/format";

describe("bulk price", () => {
  it("adds or removes naira and re-rounds up to ₦50", () => {
    expect(applyBulkOp(15350, { kind: "amount", amount: 1000 })).toBe(16350);
    expect(applyBulkOp(15350, { kind: "amount", amount: -1020 })).toBe(14350);
  });
  it("applies a percentage and re-rounds up to ₦50", () => {
    expect(applyBulkOp(15350, { kind: "percent", percent: 10 })).toBe(16900); // 16,885 → 16,900
    expect(applyBulkOp(20000, { kind: "percent", percent: -10 })).toBe(18000);
  });
  it("sets the price from a net amount with the jersey gross-up", () => {
    expect(applyBulkOp(99999, { kind: "set-net", net: 15000 })).toBe(15350);
  });
  it("never goes below ₦50", () => {
    expect(applyBulkOp(1000, { kind: "amount", amount: -5000 })).toBe(50);
  });
  it("changes sale prices only when asked, and drops a sale that is no longer lower", () => {
    const p = { id: "a", price: 15350, sale_price: 13850 };
    expect(planBulkChange(p, { kind: "percent", percent: 10 }, false)).toEqual({ id: "a", price: 16900, sale_price: 13850 });
    expect(planBulkChange(p, { kind: "percent", percent: 10 }, true)).toEqual({ id: "a", price: 16900, sale_price: 15250 });
    expect(planBulkChange(p, { kind: "set-net", net: 12000 }, true)).toEqual({ id: "a", price: 12300, sale_price: null });
  });
});

describe("Lagos dates", () => {
  it("formats in Nigerian time (UTC+1)", () => {
    expect(formatDateTime("2026-09-26T23:30:00Z")).toBe("27 Sep 2026, 00:30");
    expect(lagosDay(new Date("2026-09-26T23:30:00Z"))).toBe("2026-09-27");
    expect(lagosDayStart("2026-09-27").toISOString()).toBe("2026-09-26T23:00:00.000Z");
  });
});

describe("analytics", () => {
  // Sunday 27 Sep 2026, 00:30 in Lagos.
  const now = new Date("2026-09-26T23:30:00Z");
  it("starts periods at Lagos midnight; weeks start Monday", () => {
    expect(periodStart("today", now).toISOString()).toBe("2026-09-26T23:00:00.000Z");
    expect(periodStart("week", now).toISOString()).toBe("2026-09-20T23:00:00.000Z");
    expect(periodStart("month", now).toISOString()).toBe("2026-08-31T23:00:00.000Z");
  });

  const order = (o: Partial<AnalyticsOrder>): AnalyticsOrder => ({
    total: 18450,
    discount: 0,
    paid_at: "2026-09-26T10:00:00Z",
    state: "Lagos",
    delivery_zone: "A",
    voucher_code: null,
    order_items: [{ product_name: "Super Eagles Home", quantity: 1, item_total: 15900 }],
    ...o,
  });

  it("totals revenue, estimated Paystack fees and net", () => {
    expect(totals([order({}), order({ total: 2000 })])).toEqual({
      orders: 2,
      revenue: 20450,
      fees: 407, // 376.75 + 30
      net: 20043,
    });
  });

  it("groups top jerseys, states, zones and vouchers", () => {
    const b = breakdown([
      order({}),
      order({ state: "Oyo", delivery_zone: "B", voucher_code: "APW-7KQ2", discount: 1000, total: 17450,
        order_items: [{ product_name: "Arsenal Home", quantity: 2, item_total: 40900 }] }),
    ]);
    expect(b.topProducts.map((r) => [r.key, r.quantity])).toEqual([["Arsenal Home", 2], ["Super Eagles Home", 1]]);
    expect(b.byZone.map((r) => r.key)).toEqual(["A", "B"]);
    expect(b.vouchers).toEqual([{ key: "APW-7KQ2", orders: 1, quantity: 0, revenue: 17450, discount: 1000 }]);
  });
});

describe("csv", () => {
  it("quotes commas/quotes and neutralises formulas", () => {
    expect(csvCell('Ada, "Chi"')).toBe('"Ada, ""Chi"""');
    expect(csvCell("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(csvCell(null)).toBe("");
    expect(toCsv(["a", "b"], [[1, true]])).toBe("a,b\r\n1,true\r\n");
  });
});

describe("voucher codes", () => {
  it("look like APW-XXXX with no ambiguous characters", () => {
    for (let i = 0; i < 50; i++) expect(randomVoucherCode()).toMatch(/^APW-[2-9A-HJ-NP-Z]{4}$/);
    expect(new Set(randomVoucherCodes(30)).size).toBe(30);
  });
});

describe("admin schemas", () => {
  const product = {
    name: "Arsenal Home 25/26",
    slug: "arsenal-home-2025-26",
    club: "Arsenal",
    gender: "male",
    type: "fan",
    era: "current",
    collections: ["new-arrivals", "new-arrivals"],
    sizes: ["S", "M", "L"],
    out_of_stock_sizes: ["L", "XXL"],
    price: 20450,
    sale_price: null,
    image_front: "https://x.supabase.co/storage/v1/object/public/product-images/a.webp",
    image_back: null,
    gallery: [],
    allow_name_number: true,
    customizer: { name: { top: 18, left: 50, width: 60, fontSize: 9 }, textColor: "#FFFFFF", font: "bebas" },
    is_active: true,
    is_featured: false,
    sort_order: 0,
    badge_ids: [],
  } as const;

  it("accepts a product and tidies lists", () => {
    const r = productInputSchema.parse(product);
    expect(r.out_of_stock_sizes).toEqual(["L"]);
    expect(r.collections).toEqual(["new-arrivals"]);
  });
  it("rejects a sale price that isn't lower", () => {
    const r = productInputSchema.safeParse({ ...product, sale_price: 20450 });
    expect(r.success).toBe(false);
  });
  it("rejects fractional naira", () => {
    expect(productInputSchema.safeParse({ ...product, price: 100.5 }).success).toBe(false);
  });

  const voucher = {
    code: "eid-10",
    quantity: 1,
    discount_type: "percent",
    discount_value: 10,
    max_discount: 2000,
    min_order_value: 0,
    max_uses: 100,
    product_ids: [],
    expires_at: "2026-12-31",
    note: "",
  } as const;
  it("normalises voucher codes and ends expiry at Lagos midnight", () => {
    const r = voucherInputSchema.parse(voucher);
    expect(r.code).toBe("EID-10");
    expect(r.expires_at).toBe("2026-12-31T23:59:59+01:00");
    expect(r.product_ids).toBeNull();
    expect(r.note).toBeNull();
  });
  it("rejects percentages over 100 and a code with several copies", () => {
    expect(voucherInputSchema.safeParse({ ...voucher, discount_value: 150 }).success).toBe(false);
    expect(voucherInputSchema.safeParse({ ...voucher, quantity: 5 }).success).toBe(false);
  });
  it("drops max discount for fixed vouchers", () => {
    expect(voucherInputSchema.parse({ ...voucher, code: null, discount_type: "fixed", discount_value: 1000 }).max_discount).toBeNull();
  });
  it("normalises logistics phone numbers", () => {
    const r = orderUpdateSchema.parse({
      orderId: "5f0c5a8e-3b8e-4e39-9d3e-1c1a4f0e2b7a",
      status: "dispatched",
      logistics_phone: "0803 123 4567",
      emailCustomer: true,
    });
    expect(r.logistics_phone).toBe("2348031234567");
    expect(r.logistics_name).toBeNull();
  });
});

describe("order filters", async () => {
  const { dateRange, orderSearchFilter, parseOrderFilters, filtersToSearch } = await import("@/lib/admin/orders");
  it("defaults to paid orders and ignores junk", () => {
    const f = parseOrderFilters({ status: "nope", pay: "x", from: "2026-13-45", page: "-2" });
    expect(f).toEqual({ status: null, pay: "paid", from: null, to: null, q: "", page: 1 });
    expect(filtersToSearch(f)).toBe("");
    expect(filtersToSearch(f, { page: 2 })).toBe("?page=2");
  });
  it("uses whole Lagos days for the date range", () => {
    expect(dateRange({ from: "2026-09-01", to: "2026-09-30" })).toEqual({
      gte: "2026-08-31T23:00:00.000Z",
      lt: "2026-09-30T23:00:00.000Z",
    });
  });
  it("builds a safe search filter", () => {
    expect(orderSearchFilter("APW-1007")).toBe('order_number.ilike."*APW-1007*",customer_name.ilike."*APW-1007*",email.ilike."*APW-1007*"');
    expect(orderSearchFilter("0803 123")).toContain('phone.ilike."*803123*"');
    expect(orderSearchFilter('a,b)"(')).toBe('order_number.ilike."*ab*",customer_name.ilike."*ab*",email.ilike."*ab*"');
    expect(orderSearchFilter("  ")).toBeNull();
  });
});
