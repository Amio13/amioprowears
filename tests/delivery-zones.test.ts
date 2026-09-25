import { describe, expect, it } from "vitest";
import {
  DELIVERY_ZONES,
  NIGERIAN_STATES,
  deliveryFeeForZone,
  getDeliveryForState,
  getZoneForState,
  isNigerianState,
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

  it("customer fees match the spec", () => {
    expect(deliveryFeeForZone("A")).toBe(2050);
    expect(deliveryFeeForZone("B")).toBe(2550);
    expect(deliveryFeeForZone("C")).toBe(3600);
  });

  it("looks up by state", () => {
    expect(getDeliveryForState("Enugu")).toEqual({ zone: "A", fee: 2050 });
    expect(getDeliveryForState("Lagos")).toEqual({ zone: "B", fee: 2550 });
    expect(getDeliveryForState("FCT Abuja")).toEqual({ zone: "C", fee: 3600 });
  });

  it("rejects unknown states", () => {
    expect(getZoneForState("Accra")).toBeNull();
    expect(getDeliveryForState("lagos")).toBeNull(); // exact match only (value comes from the select)
    expect(isNigerianState("Lagos")).toBe(true);
    expect(isNigerianState("Texas")).toBe(false);
  });
});
