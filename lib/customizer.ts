/**
 * Jersey customiser rules: overlay positions, name/number cleaning, and text sizing.
 * Pure functions — shared by the product page (browser) and checkout (server).
 *
 * Overlay boxes are percentages of the product photo (photos are 4:5):
 *   left  = horizontal CENTRE of the box
 *   top   = TOP edge of the box
 *   width = box width; fontSize = text height, both as % of the photo width.
 */
import type { BadgePosition, CustomizerConfig, OverlayBox } from "@/types";

export const NAME_MAX_LENGTH = 12;
export const NUMBER_MAX = 99;

/** Used when a product has no (or partial) customiser config. */
export const DEFAULT_CUSTOMIZER: Required<CustomizerConfig> & {
  name: Required<OverlayBox>;
  number: Required<OverlayBox>;
  badges: Record<BadgePosition, OverlayBox>;
} = {
  name: { top: 18, left: 50, width: 46, fontSize: 9 },
  number: { top: 30, left: 50, width: 40, fontSize: 28 },
  badges: {
    left_chest: { top: 12, left: 64, width: 10 },
    right_chest: { top: 22, left: 36, width: 12 },
    sleeve: { top: 21, left: 16.5, width: 9 },
  },
  textColor: "#FFFFFF",
  font: "bebas",
};

/** Product config with every missing piece filled from the defaults. */
export function resolveCustomizer(config: CustomizerConfig | null | undefined) {
  const c = config ?? {};
  return {
    name: { ...DEFAULT_CUSTOMIZER.name, ...c.name },
    number: { ...DEFAULT_CUSTOMIZER.number, ...c.number },
    badges: { ...DEFAULT_CUSTOMIZER.badges, ...c.badges },
    textColor: c.textColor ?? DEFAULT_CUSTOMIZER.textColor,
    font: c.font ?? DEFAULT_CUSTOMIZER.font,
  };
}
export type ResolvedCustomizer = ReturnType<typeof resolveCustomizer>;

// ---------------------------------------------------------------------------
// Name and number
// ---------------------------------------------------------------------------

/**
 * Clean the name AS THE CUSTOMER TYPES: upper-case, drop anything that isn't a
 * letter, space or hyphen, no leading or doubled separators, max 12 characters.
 * A trailing space/hyphen is kept so they can keep typing ("JAY-" → "JAY-JAY").
 */
export function sanitizeNameInput(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[^A-Z -]/g, "")
    .replace(/^[ -]+/, "")
    .replace(/[ -]{2,}/g, (m) => m[0]!)
    .slice(0, NAME_MAX_LENGTH);
}

/** Final form of the name (on add to cart / checkout): trailing separators removed. */
export function normalizeName(raw: string): string {
  return sanitizeNameInput(raw).replace(/[ -]+$/, "");
}

/** Letters, with single spaces or hyphens between them. 1–12 characters. */
export const NAME_PATTERN = /^[A-Z]+(?:[ -][A-Z]+)*$/;

export function isValidName(name: string): boolean {
  return name.length >= 1 && name.length <= NAME_MAX_LENGTH && NAME_PATTERN.test(name);
}

/** Digits only, at most 2, as the customer types. */
export function sanitizeNumberInput(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 2);
}

/** "07" → "7"; "" stays "". */
export function normalizeNumber(raw: string): string {
  const digits = sanitizeNumberInput(raw);
  return digits === "" ? "" : String(Number(digits));
}

export function isValidNumber(n: string): boolean {
  return /^\d{1,2}$/.test(n) && Number(n) <= NUMBER_MAX && String(Number(n)) === n;
}

// ---------------------------------------------------------------------------
// Text sizing
// ---------------------------------------------------------------------------

/** Rough average width of an upper-case glyph, as a fraction of font size (incl. letter-spacing). */
const GLYPH_WIDTH = { bebas: 0.48, oswald: 0.58 } as const;

/**
 * Font size (in % of photo width) that keeps `text` inside the box: the configured
 * size, shrunk just enough for long names like "NWANKWO-KANU".
 */
export function fitFontSize(text: string, box: Required<OverlayBox>, font: "bebas" | "oswald"): number {
  if (!text) return box.fontSize;
  const fitting = box.width / (text.length * GLYPH_WIDTH[font]);
  return Math.min(box.fontSize, Math.round(fitting * 100) / 100);
}
