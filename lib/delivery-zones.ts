import { grossUpAddon } from "@/lib/pricing";

/**
 * Motor-park delivery zones. `net` is what the owner receives; the customer fee
 * adds Paystack's 1.5% (grossUpAddon). Charged once per order. See docs/SPEC.md → 3.4.
 */
export const DELIVERY_ZONES = {
  A: { net: 2000, states: ["Abia", "Anambra", "Ebonyi", "Enugu", "Imo"] },
  B: {
    net: 2500,
    states: [
      "Lagos", "Ogun", "Oyo", "Osun", "Ondo", "Ekiti", "Rivers", "Delta", "Edo",
      "Bayelsa", "Cross River", "Akwa Ibom",
    ],
  },
  C: {
    net: 3500,
    states: [
      "FCT Abuja", "Kano", "Kaduna", "Katsina", "Sokoto", "Zamfara", "Jigawa", "Kebbi",
      "Niger", "Plateau", "Benue", "Kogi", "Kwara", "Nasarawa", "Gombe", "Bauchi",
      "Adamawa", "Taraba", "Borno", "Yobe",
    ],
  },
} as const;

export type DeliveryZoneId = keyof typeof DELIVERY_ZONES;
export type NigerianState = (typeof DELIVERY_ZONES)[DeliveryZoneId]["states"][number];

const ZONE_IDS = Object.keys(DELIVERY_ZONES) as DeliveryZoneId[];

/** All 36 states + FCT, alphabetical — for the checkout <select>. */
export const NIGERIAN_STATES: NigerianState[] = ZONE_IDS.flatMap(
  (z) => DELIVERY_ZONES[z].states as readonly NigerianState[],
).sort((a, b) => a.localeCompare(b));

export function isNigerianState(s: string): s is NigerianState {
  return (NIGERIAN_STATES as string[]).includes(s);
}

export function getZoneForState(state: string): DeliveryZoneId | null {
  return ZONE_IDS.find((z) => (DELIVERY_ZONES[z].states as readonly string[]).includes(state)) ?? null;
}

/** Customer delivery fee for a zone (fee-inclusive, integer naira). */
export function deliveryFeeForZone(zone: DeliveryZoneId): number {
  return grossUpAddon(DELIVERY_ZONES[zone].net);
}

export function getDeliveryForState(state: string): { zone: DeliveryZoneId; fee: number } | null {
  const zone = getZoneForState(state);
  return zone ? { zone, fee: deliveryFeeForZone(zone) } : null;
}
