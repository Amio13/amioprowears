import { describe, expect, it } from "vitest";
import {
  DEFAULT_CUSTOMIZER,
  fitFontSize,
  isValidName,
  isValidNumber,
  normalizeName,
  normalizeNumber,
  resolveCustomizer,
  sanitizeNameInput,
  sanitizeNumberInput,
} from "@/lib/customizer";
import { lineUnitPrice } from "@/lib/pricing";
import { cartLineSchema, customNameSchema, customNumberSchema } from "@/lib/validation";

describe("name input", () => {
  it("upper-cases and keeps letters, spaces and hyphens", () => {
    expect(sanitizeNameInput("okocha")).toBe("OKOCHA");
    expect(sanitizeNameInput("Jay-Jay")).toBe("JAY-JAY");
    expect(sanitizeNameInput("o'neil 10!")).toBe("ONEIL ");
  });

  it("drops leading and doubled separators, caps at 12", () => {
    expect(sanitizeNameInput("  -ade")).toBe("ADE");
    expect(sanitizeNameInput("ade  ola--b")).toBe("ADE OLA-B");
    expect(sanitizeNameInput("abcdefghijklmnop")).toBe("ABCDEFGHIJKL");
  });

  it("keeps a trailing separator while typing but not in the final name", () => {
    expect(sanitizeNameInput("jay-")).toBe("JAY-");
    expect(normalizeName("jay-")).toBe("JAY");
    expect(normalizeName("ade ")).toBe("ADE");
  });

  it("validates the final name", () => {
    expect(isValidName("NWANKWO-KANU")).toBe(true);
    expect(isValidName("A")).toBe(true);
    expect(isValidName("")).toBe(false);
    expect(isValidName("ADE ")).toBe(false);
    expect(isValidName("ade")).toBe(false);
    expect(isValidName("ABCDEFGHIJKLM")).toBe(false);
  });
});

describe("number input", () => {
  it("digits only, max 2", () => {
    expect(sanitizeNumberInput("1a0")).toBe("10");
    expect(sanitizeNumberInput("123")).toBe("12");
  });

  it("keeps leading zeros (customers want 01, 07) and validates 1–2 digits", () => {
    expect(normalizeNumber("07")).toBe("07");
    expect(normalizeNumber("01")).toBe("01");
    expect(normalizeNumber("00")).toBe("00");
    expect(normalizeNumber("")).toBe("");
    expect(isValidNumber("0")).toBe(true);
    expect(isValidNumber("07")).toBe(true);
    expect(isValidNumber("99")).toBe(true);
    expect(isValidNumber("100")).toBe(false);
    expect(isValidNumber("")).toBe(false);
  });
});

describe("zod schemas (server-side check)", () => {
  it("customName: cleans, rejects junk, empty → undefined", () => {
    expect(customNameSchema.parse(" okocha ")).toBe("OKOCHA");
    expect(customNameSchema.parse("")).toBeUndefined();
    // Anything the input would silently strip is cleaned, not rejected…
    expect(customNameSchema.parse("jay-jay!")).toBe("JAY-JAY");
    // …but something too long to be a real name is rejected.
    expect(customNameSchema.safeParse("x".repeat(41)).success).toBe(false);
  });

  it("customNumber: 0–99 only", () => {
    expect(customNumberSchema.parse("10")).toBe("10");
    expect(customNumberSchema.parse("07")).toBe("07");
    expect(customNumberSchema.parse(" 3 ")).toBe("3");
    expect(customNumberSchema.parse("")).toBeUndefined();
    expect(customNumberSchema.safeParse("100").success).toBe(false);
    expect(customNumberSchema.safeParse("1a").success).toBe(false);
    expect(customNumberSchema.safeParse("-1").success).toBe(false);
  });

  it("cartLine: IDs and choices only; unknown keys like price are dropped", () => {
    const line = cartLineSchema.parse({
      productId: "3f1c2b9e-8d4a-4c5e-9f6a-1b2c3d4e5f60",
      size: "M",
      customName: "okocha",
      customNumber: "10",
      badgeId: "b0000000-0000-4000-8000-000000000003",
      quantity: 2,
      price: 1, // tampered — must not survive parsing
    });
    expect(line).toEqual({
      productId: "3f1c2b9e-8d4a-4c5e-9f6a-1b2c3d4e5f60",
      size: "M",
      customName: "OKOCHA",
      customNumber: "10",
      badgeId: "b0000000-0000-4000-8000-000000000003",
      quantity: 2,
    });
    expect(cartLineSchema.safeParse({ productId: "x", size: "M", quantity: 1 }).success).toBe(false);
    expect(cartLineSchema.safeParse({ productId: "3f1c2b9e-8d4a-4c5e-9f6a-1b2c3d4e5f60", size: "M", quantity: 21 }).success).toBe(false);
  });
});

describe("lineUnitPrice", () => {
  const jersey = { price: 15350, sale_price: null };

  it("plain jersey", () => {
    expect(lineUnitPrice({ product: jersey, nameNumberFee: 550, hasNameOrNumber: false })).toBe(15350);
  });

  it("SPEC 3.3 example: ₦15,350 jersey + ₦550 name/number", () => {
    expect(lineUnitPrice({ product: jersey, nameNumberFee: 550, hasNameOrNumber: true })).toBe(15900);
  });

  it("adds the badge and uses the sale price", () => {
    expect(
      lineUnitPrice({ product: { price: 15350, sale_price: 13850 }, nameNumberFee: 550, hasNameOrNumber: true, badgePrice: 1050 }),
    ).toBe(15450);
  });
});

describe("overlay config", () => {
  it("fills missing pieces from the defaults", () => {
    const c = resolveCustomizer({ name: { top: 10, left: 50, width: 60 }, font: "oswald" });
    expect(c.name).toEqual({ top: 10, left: 50, width: 60, fontSize: 9 });
    expect(c.number).toEqual(DEFAULT_CUSTOMIZER.number);
    expect(c.badges.sleeve).toEqual(DEFAULT_CUSTOMIZER.badges.sleeve);
    expect(c.font).toBe("oswald");
    expect(resolveCustomizer(null).textColor).toBe("#FFFFFF");
  });

  it("fitFontSize keeps short names at full size and shrinks long ones to fit", () => {
    const box = DEFAULT_CUSTOMIZER.name;
    expect(fitFontSize("ADE", box, "bebas")).toBe(9);
    const long = fitFontSize("NWANKWO-KANU", box, "oswald");
    expect(long).toBeLessThan(9);
    expect(long * 12 * 0.58).toBeLessThanOrEqual(box.width + 0.01);
  });
});
