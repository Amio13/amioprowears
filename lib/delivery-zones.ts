import { grossUpAddon } from "@/lib/pricing";

/**
 * Motor-park delivery zones. Charged once per order. See docs/SPEC.md → 3.4.
 * Which states are in which zone lives here in code. The fee for each zone is set in
 * admin → Settings (settings.delivery_fee_a/b/c, migration 0008); `net` (what the owner
 * receives) is only the built-in default, used if the database has no value.
 */
export const DELIVERY_ZONES = {
  A: { net: 2000, states: ["Abia", "Anambra", "Ebonyi", "Enugu", "Imo"] },
  B: {
    net: 3000,
    states: [
      "Lagos", "Ogun", "Oyo", "Osun", "Ondo", "Ekiti", "Rivers", "Delta", "Edo",
      "Bayelsa", "Cross River", "Akwa Ibom",
    ],
  },
  C: {
    net: 4000,
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

/** Customer delivery fee per zone (fee-inclusive, integer naira). */
export type DeliveryFees = Record<DeliveryZoneId, number>;

export const DEFAULT_DELIVERY_FEES: DeliveryFees = {
  A: grossUpAddon(DELIVERY_ZONES.A.net),
  B: grossUpAddon(DELIVERY_ZONES.B.net),
  C: grossUpAddon(DELIVERY_ZONES.C.net),
};

/** Settings columns holding each zone's customer fee. */
export const DELIVERY_FEE_COLUMNS = { A: "delivery_fee_a", B: "delivery_fee_b", C: "delivery_fee_c" } as const;

/**
 * Zone fees from a settings row. Any missing or invalid value (e.g. migration 0008 not
 * applied yet) falls back to the default, so checkout always has a fee.
 */
export function resolveDeliveryFees(row: Record<string, unknown> | null | undefined): DeliveryFees {
  const fees = { ...DEFAULT_DELIVERY_FEES };
  for (const zone of ZONE_IDS) {
    const v = row?.[DELIVERY_FEE_COLUMNS[zone]];
    if (typeof v === "number" && Number.isInteger(v) && v >= 0) fees[zone] = v;
  }
  return fees;
}

export function getDeliveryForState(state: string, fees: DeliveryFees): { zone: DeliveryZoneId; fee: number } | null {
  const zone = getZoneForState(state);
  return zone ? { zone, fee: fees[zone] } : null;
}

/** Lowest zone fee — the cart shows "from ₦…" before the state is known. */
export function cheapestDeliveryFee(fees: DeliveryFees): number {
  return Math.min(...ZONE_IDS.map((z) => fees[z]));
}
