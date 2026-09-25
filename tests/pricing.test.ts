import { describe, expect, it } from "vitest";
import {
  effectivePrice,
  grossUpAddon,
  grossUpJersey,
  paystackFee,
  roundUpTo,
} from "@/lib/pricing";

describe("grossUpJersey — SPEC 3.3 worked examples", () => {
  // [net, customer price, Paystack fee, owner actually receives]
  const table: [number, number, number, number][] = [
    [10000, 10300, 254.5, 10045.5],
    [12000, 12300, 284.5, 12015.5],
    [15000, 15350, 330.25, 15019.75],
    [20000, 20450, 406.75, 20043.25],
    [25000, 25500, 482.5, 25017.5],
    [35000, 35650, 634.75, 35015.25],
  ];

  it.each(table)("net ₦%i → ₦%i (fee %d, receive %d)", (net, price, fee, receive) => {
    expect(grossUpJersey(net)).toBe(price);
    expect(paystackFee(price)).toBeCloseTo(fee, 2);
    expect(price - paystackFee(price)).toBeCloseTo(receive, 2);
    expect(price - paystackFee(price)).toBeGreaterThanOrEqual(net);
  });
});

describe("grossUpJersey — ₦2,000 cap boundary", () => {
  it("uses the percentage formula just below the crossover", () => {
    expect(grossUpJersey(100000)).toBe(roundUpTo((100000 + 100) / 0.985));
    expect(grossUpJersey(124666)).toBe(roundUpTo((124666 + 100) / 0.985));
  });

  it.each([124667, 130000, 200000, 500000])("net ₦%i and above → net + ₦2,000", (net) => {
    expect(grossUpJersey(net)).toBe(roundUpTo(net + 2000));
  });

  it("owner still receives at least net when the cap applies", () => {
    const price = grossUpJersey(200000);
    expect(price).toBe(202000);
    expect(paystackFee(price)).toBe(2000);
    expect(price - paystackFee(price)).toBe(200000);
  });
});

describe("grossUpAddon", () => {
  it("₦500 name+number → ₦550", () => expect(grossUpAddon(500)).toBe(550));
  it.each([
    [2000, 2050],
    [2500, 2550],
    [3500, 3600],
  ])("delivery net ₦%i → ₦%i", (net, fee) => expect(grossUpAddon(net)).toBe(fee));
  it("zero stays zero", () => expect(grossUpAddon(0)).toBe(0));
  it("isn't pushed up a step by float noise (197 / 0.985 = 200)", () =>
    expect(grossUpAddon(197)).toBe(200));
});

describe("paystackFee", () => {
  it("below ₦2,500: percentage only", () => {
    expect(paystackFee(2000)).toBeCloseTo(30, 2);
    expect(paystackFee(2499)).toBeCloseTo(37.485, 3);
  });
  it("at/above ₦2,500: percentage + ₦100", () => {
    expect(paystackFee(2500)).toBeCloseTo(137.5, 2);
    expect(paystackFee(18450)).toBeCloseTo(376.75, 2);
  });
  it("capped at ₦2,000", () => {
    expect(paystackFee(126667)).toBe(2000);
    expect(paystackFee(1_000_000)).toBe(2000);
  });
});

describe("whole-order check (SPEC 3.3)", () => {
  it("₦15,350 jersey + ₦550 name/number + ₦2,550 Zone B = ₦18,450, owner ≥ ₦18,000", () => {
    const total = grossUpJersey(15000) + grossUpAddon(500) + grossUpAddon(2500);
    expect(total).toBe(18450);
    expect(total - paystackFee(total)).toBeCloseTo(18073.25, 2);
  });
});

describe("roundUpTo / effectivePrice", () => {
  it("rounds up to ₦50 by default", () => {
    expect(roundUpTo(10001)).toBe(10050);
    expect(roundUpTo(10050)).toBe(10050);
    expect(roundUpTo(507.6, 10)).toBe(510);
  });
  it("uses sale price only when set and lower", () => {
    expect(effectivePrice({ price: 15350, sale_price: null })).toBe(15350);
    expect(effectivePrice({ price: 15350, sale_price: 12300 })).toBe(12300);
    expect(effectivePrice({ price: 15350, sale_price: 16000 })).toBe(15350);
  });
});
