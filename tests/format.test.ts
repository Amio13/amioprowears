import { describe, expect, it } from "vitest";
import {
  formatNaira,
  formatPhoneForDisplay,
  normalizeNigerianPhone,
  whatsappLink,
} from "@/lib/format";

describe("formatNaira", () => {
  it.each([
    [0, "₦0"],
    [550, "₦550"],
    [18450, "₦18,450"],
    [1234567, "₦1,234,567"],
    [-1000, "-₦1,000"],
  ])("%i → %s", (n, s) => expect(formatNaira(n)).toBe(s));
});

describe("normalizeNigerianPhone", () => {
  it.each([
    "08031234567",
    "0803 123 4567",
    "0803-123-4567",
    "+2348031234567",
    "+234 803 123 4567",
    "2348031234567",
    "8031234567",
  ])("%s → 2348031234567", (input) => {
    expect(normalizeNigerianPhone(input)).toBe("2348031234567");
  });

  it.each(["07061234567", "09011234567", "08111234567", "09151234567"])(
    "accepts prefix of %s",
    (input) => expect(normalizeNigerianPhone(input)).toMatch(/^234\d{10}$/),
  );

  it.each(["", "0803123456", "080312345678", "05031234567", "+44 7700 900123", "0803abc4567", "2340803123456"])(
    "rejects %s",
    (input) => expect(normalizeNigerianPhone(input)).toBeNull(),
  );
});

describe("formatPhoneForDisplay / whatsappLink", () => {
  it("formats a normalised number", () =>
    expect(formatPhoneForDisplay("2348031234567")).toBe("0803 123 4567"));
  it("leaves other input alone", () => expect(formatPhoneForDisplay("12345")).toBe("12345"));
  it("builds a wa.me link with encoded text", () =>
    expect(whatsappLink("2348031234567", "Hi, I need help")).toBe(
      "https://wa.me/2348031234567?text=Hi%2C%20I%20need%20help",
    ));
});
