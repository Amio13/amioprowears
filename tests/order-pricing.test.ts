import { describe, expect, it } from "vitest";
import { DEFAULT_DELIVERY_FEES } from "@/lib/delivery-zones";
import { priceOrder, type PricingData, type PricingProduct } from "@/lib/order-pricing";
import { cartLineSchema, type CartLineInput } from "@/lib/validation";

const P1 = "11111111-1111-4111-8111-111111111111"; // ₦15,350, allows name/number
const P2 = "22222222-2222-4222-8222-222222222222"; // on sale ₦13,850, no name/number, XS sold out
const B1 = "b0000000-0000-4000-8000-000000000001"; // ₦1,050, allowed on P1 only
const B2 = "b0000000-0000-4000-8000-000000000002"; // inactive
const B3 = "b0000000-0000-4000-8000-000000000003"; // ₦1,550, allowed on P1

const product = (o: Partial<PricingProduct> & Pick<PricingProduct, "id">): PricingProduct => ({
  slug: o.id,
  name: `Jersey ${o.id.slice(0, 2)}`,
  price: 15350,
  sale_price: null,
  sizes: ["XS", "S", "M", "L"],
  out_of_stock_sizes: [],
  allow_name_number: true,
  is_active: true,
  image_front: "/f.svg",
  image_back: "/b.svg",
  customizer: { font: "anton", curve: "slight" },
  ...o,
});

const data: PricingData = {
  products: new Map([
    [P1, product({ id: P1 })],
    [P2, product({ id: P2, sale_price: 13850, allow_name_number: false, out_of_stock_sizes: ["XS"] })],
  ]),
  badges: new Map([
    [B1, { id: B1, name: "AFCON", price: 1050, is_active: true, image_url: "/afcon.png" }],
    [B2, { id: B2, name: "Old", price: 500, is_active: false, image_url: "/old.png" }],
    [B3, { id: B3, name: "Premier League", price: 1550, is_active: true, image_url: "/pl.png" }],
  ]),
  allowedBadges: new Set([`${P1}:${B1}`, `${P1}:${B2}`, `${P1}:${B3}`]),
  nameNumberFee: 550,
  deliveryFees: DEFAULT_DELIVERY_FEES, // A ₦2,050, B ₦3,050, C ₦4,100
};

const line = (o: Partial<CartLineInput> = {}): CartLineInput => ({ productId: P1, size: "M", quantity: 1, badgeIds: [], ...o });

describe("priceOrder", () => {
  it("SPEC 3.3 whole-order example: ₦15,350 + ₦550 name/number + Zone B = ₦18,950", () => {
    const q = priceOrder({ lines: [line({ customName: "OKOCHA", customNumber: "10" })], data, state: "Lagos" });
    expect(q.problems).toEqual([]);
    expect(q.lines[0]).toMatchObject({ unitPrice: 15350, customizationFee: 550, badgePrice: 0, lineTotal: 15900 });
    expect(q.delivery).toEqual({ zone: "B", fee: 3050 });
    expect(q.total).toBe(18950);
  });

  it("badge + quantity + sale price; delivery charged once", () => {
    const q = priceOrder({
      lines: [line({ customNumber: "07", badgeIds: [B1], quantity: 2 }), line({ productId: P2, size: "S" })],
      data,
      state: "Enugu",
    });
    expect(q.lines.map((l) => l.lineTotal)).toEqual([(15350 + 550 + 1050) * 2, 13850]);
    expect(q.subtotal).toBe(47750);
    expect(q.delivery?.fee).toBe(2050);
    expect(q.total).toBe(47750 + 2050);
  });

  it("a price sent by the browser is ignored (stripped by the schema, never read)", () => {
    const tampered = cartLineSchema.parse({ productId: P1, size: "M", quantity: 1, price: 100, unitPrice: 1, total: 1 });
    const q = priceOrder({ lines: [tampered], data, state: "Lagos" });
    expect(q.lines[0]!.lineTotal).toBe(15350);
    expect(q.total).toBe(15350 + 3050);
  });

  it("reports problems per line and leaves them out of the total", () => {
    const q = priceOrder({
      lines: [
        line(), // ok
        line({ productId: "33333333-3333-4333-8333-333333333333" }), // unknown product
        line({ productId: P2, size: "XS" }), // sold out
        line({ size: "XXL" }), // not a size of this jersey
        line({ productId: P2, size: "M", customName: "ADE" }), // no name printing on P2
        line({ badgeIds: [B1, B2] }), // one inactive badge
        line({ productId: P2, size: "M", badgeIds: [B1] }), // badge not allowed on P2
      ],
      data,
    });
    expect(q.lines.map((l) => l.index)).toEqual([0]);
    expect(q.problems.map((p) => p.index)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(q.problems[1]!.error).toContain("sold out");
    expect(q.subtotal).toBe(15350);
  });

  it("inactive product is rejected", () => {
    const d = { ...data, products: new Map([[P1, product({ id: P1, is_active: false })]]) };
    expect(priceOrder({ lines: [line()], data: d }).problems).toHaveLength(1);
  });

  it("no state yet → no delivery in the total (cart page)", () => {
    const q = priceOrder({ lines: [line()], data });
    expect(q.delivery).toBeNull();
    expect(q.deliveryFrom).toBe(2050);
    expect(q.total).toBe(15350);
  });

  it("voucher comes off items, not delivery", () => {
    const q = priceOrder({
      lines: [line()],
      data,
      state: "Lagos",
      voucherCode: "BIG",
      voucher: {
        id: "v", code: "BIG", discount_type: "fixed", discount_value: 99999, max_discount: null,
        min_order_value: 0, max_uses: 1, used_count: 0, product_ids: null, expires_at: null, is_active: true,
      },
    });
    expect(q.discount).toBe(15350);
    expect(q.total).toBe(3050);
    expect(q.voucher).toMatchObject({ ok: true, code: "BIG" });
  });

  it("invalid voucher → no discount, error kept for the UI", () => {
    const q = priceOrder({ lines: [line()], data, voucherCode: "NOPE", voucher: null });
    expect(q.discount).toBe(0);
    expect(q.voucher).toMatchObject({ ok: false, code: "NOPE" });
  });

  it("uses the delivery fees from admin → Settings", () => {
    const q = priceOrder({ lines: [line()], data: { ...data, deliveryFees: { A: 1000, B: 5000, C: 9000 } }, state: "Kano" });
    expect(q.delivery).toEqual({ zone: "C", fee: 9000 });
    expect(q.deliveryFrom).toBe(1000);
    expect(q.total).toBe(15350 + 9000);
  });

  it("several badges: each is checked and priced, names and pictures are kept for the order", () => {
    const q = priceOrder({ lines: [line({ customName: "OKOCHA", badgeIds: [B1, B3] })], data });
    const l = q.lines[0]!;
    expect(l.badgePrice).toBe(1050 + 1550);
    expect(l.lineTotal).toBe(15350 + 550 + 2600);
    expect(l.badgeName).toBe("AFCON + Premier League");
    expect(l.badges.map((b) => b.image_url)).toEqual(["/afcon.png", "/pl.png"]);
  });

  it("saves the print style only when a name or number is printed", () => {
    const [printed, plain] = priceOrder({ lines: [line({ customNumber: "9" }), line({ size: "L", badgeIds: [B1] })], data }).lines;
    expect(printed!.printStyle).toMatchObject({ font: "anton", curve: "slight", imageBack: "/b.svg", textColor: "#FFFFFF" });
    expect(plain!.printStyle).toBeNull();
  });
});
