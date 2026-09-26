/**
 * Fonts the owner can pick per jersey for the printed name and number (admin → jersey →
 * Print positions). Free Google look-alikes of common kit styles — official club fonts
 * are licensed, so these are "close", not exact. Loaded in app/fonts.ts; a font's file is
 * only downloaded on pages that use it.
 *
 * `glyph` = average width of an upper-case letter as a fraction of the font size
 * (incl. our 0.06em letter-spacing), measured in Chrome with "NWANKWO-KANU". Used to
 * shrink long names so they fit the name box.
 */
export const JERSEY_FONTS = {
  bebas: { label: "Bebas Neue", group: "Block", glyph: 0.49 },
  oswald: { label: "Oswald", group: "Block", glyph: 0.6 },
  anton: { label: "Anton", group: "Block", glyph: 0.57 },
  staatliches: { label: "Staatliches", group: "Block", glyph: 0.53 },
  teko: { label: "Teko", group: "Block", glyph: 0.58 },
  saira: { label: "Saira Condensed", group: "Premier League style", glyph: 0.59 },
  barlow: { label: "Barlow Condensed", group: "Premier League style", glyph: 0.57 },
  squada: { label: "Squada One", group: "Premier League style", glyph: 0.58 },
  russo: { label: "Russo One", group: "Modern", glyph: 0.8 },
  orbitron: { label: "Orbitron", group: "Modern", glyph: 0.91 },
  chakra: { label: "Chakra Petch", group: "Modern", glyph: 0.75 },
  audiowide: { label: "Audiowide", group: "Modern", glyph: 0.9 },
  racing: { label: "Racing Sans One", group: "Modern", glyph: 0.73 },
  graduate: { label: "Graduate", group: "College / retro", glyph: 0.81 },
  alfa: { label: "Alfa Slab One", group: "College / retro", glyph: 0.93 },
  blackops: { label: "Black Ops One", group: "Stencil", glyph: 0.8 },
} as const;

export type JerseyFont = keyof typeof JERSEY_FONTS;
export const JERSEY_FONT_IDS = Object.keys(JERSEY_FONTS) as [JerseyFont, ...JerseyFont[]];

export function isJerseyFont(v: unknown): v is JerseyFont {
  return typeof v === "string" && v in JERSEY_FONTS;
}

/** CSS font-family for a jersey font (the variable is set on <html> by app/fonts.ts). */
export function jerseyFontFamily(font: JerseyFont): string {
  return `var(--font-${font}), sans-serif`;
}
