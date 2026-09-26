import { describe, expect, it } from "vitest";
import {
  DEFAULT_DELIVERY_FEES,
  DELIVERY_ZONES,
  NIGERIAN_STATES,
  cheapestDeliveryFee,
  getDeliveryForState,
  getZoneForState,
  isNigerianState,
  resolveDeliveryFees,
} from "@/lib/delivery-zones";

const ALL_37 = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno",
  "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT Abuja", "Gombe", "Imo",
  "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa",
  "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe",
  "Zamfara",
];

describe("delivery zones", () => {
  it("covers all 36 states + FCT, alphabetically, with no duplicates", () => {
    expect(NIGERIAN_STATES).toHaveLength(37);
    expect(new Set(NIGERIAN_STATES).size).toBe(37);
    expect([...NIGERIAN_STATES].sort()).toEqual([...ALL_37].sort());
  });

  it.each(ALL_37)("%s maps to exactly one zone", (state) => {
    const zones = Object.entries(DELIVERY_ZONES).filter(([, z]) =>
      (z.states as readonly string[]).includes(state),
    );
    expect(zones).toHaveLength(1);
    expect(getZoneForState(state)).toBe(zones[0][0]);
  });

  it("default customer fees: owner receives ₦2,000 / ₦3,000 / ₦4,000", () => {
    expect(DEFAULT_DELIVERY_FEES).toEqual({ A: 2050, B: 3050, C: 4100 });
    expect(cheapestDeliveryFee(DEFAULT_DELIVERY_FEES)).toBe(2050);
  });

  it("looks up by state", () => {
    const fees = DEFAULT_DELIVERY_FEES;
    expect(getDeliveryForState("Enugu", fees)).toEqual({ zone: "A", fee: 2050 });
    expect(getDeliveryForState("Lagos", fees)).toEqual({ zone: "B", fee: 3050 });
    expect(getDeliveryForState("FCT Abuja", fees)).toEqual({ zone: "C", fee: 4100 });
  });

  it("reads fees from the settings row, falling back per zone", () => {
    expect(resolveDeliveryFees({ delivery_fee_a: 1500, delivery_fee_b: 3500, delivery_fee_c: 5000 })).toEqual({ A: 1500, B: 3500, C: 5000 });
    expect(resolveDeliveryFees({ delivery_fee_b: 0 })).toEqual({ A: 2050, B: 0, C: 4100 }); // free delivery is allowed
    expect(resolveDeliveryFees({ delivery_fee_a: -5, delivery_fee_b: "3000", delivery_fee_c: 12.5 })).toEqual(DEFAULT_DELIVERY_FEES);
    expect(resolveDeliveryFees(null)).toEqual(DEFAULT_DELIVERY_FEES); // migration 0008 not applied
  });

  it("rejects unknown states", () => {
    expect(getZoneForState("Accra")).toBeNull();
    expect(getDeliveryForState("lagos", DEFAULT_DELIVERY_FEES)).toBeNull(); // exact match only (value comes from the select)
    expect(isNigerianState("Lagos")).toBe(true);
    expect(isNigerianState("Texas")).toBe(false);
  });
});
