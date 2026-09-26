/**
 * Jersey customiser rules: overlay positions, name/number cleaning, and text sizing.
 * Pure functions — shared by the product page (browser) and checkout (server).
 *
 * Overlay boxes are percentages of the product photo (photos are 4:5):
 *   left  = horizontal CENTRE of the box
 *   top   = TOP edge of the box
 *   width = box width; fontSize = text height, both as % of the photo width.
 */
import { isJerseyFont, JERSEY_FONTS, type JerseyFont } from "./jersey-fonts";
import type { CustomizerConfig, NameCurve, OverlayBox, PrintSnapshot } from "@/types";

export const NAME_MAX_LENGTH = 12;

/**
 * Name arch: `sag` is how far the middle of the name rises above its ends, as a
 * fraction of the name box width (0 = straight).
 */
export const NAME_CURVES: Record<NameCurve, { label: string; sag: number }> = {
  none: { label: "Straight", sag: 0 },
  slight: { label: "Slight curve", sag: 0.07 },
  strong: { label: "Strong curve", sag: 0.14 },
};

export function isNameCurve(v: unknown): v is NameCurve {
  return typeof v === "string" && v in NAME_CURVES;
}

export interface ResolvedCustomizer {
  name: Required<OverlayBox>;
  number: Required<OverlayBox>;
  textColor: string;
  font: JerseyFont;
  curve: NameCurve;
}

/** Used when a product has no (or partial) customiser config. */
export const DEFAULT_CUSTOMIZER: ResolvedCustomizer = {
  name: { top: 18, left: 50, width: 46, fontSize: 9 },
  number: { top: 30, left: 50, width: 40, fontSize: 28 },
  textColor: "#FFFFFF",
  font: "bebas",
  curve: "none",
};

/**
 * Product config with every missing piece filled from the defaults. Unknown values
 * (a font that was removed, old badge positions) are ignored.
 */
export function resolveCustomizer(config: CustomizerConfig | null | undefined): ResolvedCustomizer {
  const c = config ?? {};
  return {
    name: { ...DEFAULT_CUSTOMIZER.name, ...c.name },
    number: { ...DEFAULT_CUSTOMIZER.number, ...c.number },
    textColor: c.textColor ?? DEFAULT_CUSTOMIZER.textColor,
    font: isJerseyFont(c.font) ? c.font : DEFAULT_CUSTOMIZER.font,
    curve: isNameCurve(c.curve) ? c.curve : DEFAULT_CUSTOMIZER.curve,
  };
}

/** Print settings saved on an order item at checkout. */
export function printSnapshot(config: CustomizerConfig | null | undefined, imageBack: string | null): PrintSnapshot {
  const { name, number, textColor, font, curve } = resolveCustomizer(config);
  return { name, number, textColor, font, curve, imageBack };
}

/** "Anton · Slight curve · #FFFFFF" for the admin order page. */
export function describePrintStyle(s: Pick<PrintSnapshot, "font" | "curve" | "textColor">): string {
  return [JERSEY_FONTS[s.font]?.label ?? s.font, NAME_CURVES[s.curve]?.label ?? s.curve, `colour ${s.textColor}`].join(" · ");
}

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

/**
 * Final form of the number: kept exactly as typed, so "01" and "07" stay two digits
 * (customers ask for them). "" stays "".
 */
export function normalizeNumber(raw: string): string {
  return sanitizeNumberInput(raw);
}

/** One or two digits: 0–99, plus zero-padded forms like "00", "01", "07". */
export function isValidNumber(n: string): boolean {
  return /^\d{1,2}$/.test(n);
}

// ---------------------------------------------------------------------------
// Text sizing
// ---------------------------------------------------------------------------

/**
 * Font size (in % of photo width) that keeps `text` inside the box: the configured
 * size, shrunk just enough for long names like "NWANKWO-KANU".
 */
export function fitFontSize(text: string, box: Required<OverlayBox>, font: JerseyFont): number {
  if (!text) return box.fontSize;
  const fitting = box.width / (text.length * JERSEY_FONTS[font].glyph);
  return Math.min(box.fontSize, Math.round(fitting * 100) / 100);
}

/** Several badge names as one string, as saved in order_items.badge_name. */
export function joinBadgeNames(names: string[]): string | null {
  return names.length ? names.join(" + ") : null;
}

/**
 * "OKOCHA · #07 · AFCON badge" (or "… · AFCON + Premier League badges") for carts,
 * orders and emails. "" if plain. `badgeName` is joinBadgeNames() output.
 */
export function describeCustomisation(l: { customName?: string | null; customNumber?: string | null; badgeName?: string | null }): string {
  const badges = l.badgeName ? `${l.badgeName} ${l.badgeName.includes(" + ") ? "badges" : "badge"}` : null;
  return [l.customName, l.customNumber ? `#${l.customNumber}` : null, badges]
    .filter(Boolean)
    .join(" · ");
}
