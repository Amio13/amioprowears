/**
 * Homepage content the owner controls from admin → Homepage. Stored as JSON in
 * settings.homepage (migration 0007). Anything missing falls back to DEFAULT_HOMEPAGE,
 * so the page always renders. Pure functions: shared by the store, the admin and tests.
 */
import { z } from "zod";
import { COLLECTION_LABELS } from "./catalogue";
import type { CollectionSlug } from "@/types";

export interface HeroTile {
  productId: string;
  side: "front" | "back";
}

export interface HomepageConfig {
  /** One line per line of the big heading. The last line is shown in red. */
  headline: string;
  subtext: string;
  /** Up to 3 pictures at the top. Empty slots are filled automatically. */
  hero: HeroTile[];
  /** Collection rows to show, in this order. */
  rows: CollectionSlug[];
  showSteps: boolean;
  steps: { title: string; body: string }[];
}

export const ALL_COLLECTIONS = Object.keys(COLLECTION_LABELS) as CollectionSlug[];
export const HERO_SLOTS = 3;

export const DEFAULT_HOMEPAGE: HomepageConfig = {
  headline: "Your name.\nYour number.\nYour team.",
  subtext: "Custom football jerseys printed with your name, number and badges — delivered to your nearest motor park.",
  hero: [],
  rows: ["top-clubs", "national-teams", "female-kits", "kids", "vintage"],
  showSteps: true,
  steps: [
    { title: "Pick your jersey", body: "Club, country or vintage — in men's, women's and kids' sizes." },
    { title: "Make it yours", body: "Add your name, number and badges and see it live before you pay." },
    { title: "Collect at the park", body: "We send it to the motor park you choose, anywhere in Nigeria." },
  ],
};

const text = (max: number, label: string) => z.string().trim().max(max, `${label} can be up to ${max} characters.`);

export const homepageSchema = z.object({
  headline: text(120, "The headline")
    .min(1, "Enter a headline.")
    .refine((v) => v.split("\n").length <= 4, "Keep the headline to 4 lines or fewer."),
  subtext: text(300, "The text under the headline"),
  hero: z
    .array(z.object({ productId: z.uuid(), side: z.enum(["front", "back"]) }))
    .max(HERO_SLOTS),
  rows: z.array(z.enum(ALL_COLLECTIONS as [CollectionSlug, ...CollectionSlug[]])).max(ALL_COLLECTIONS.length),
  showSteps: z.boolean(),
  steps: z
    .array(z.object({ title: text(60, "A step title").min(1, "Give every step a title."), body: text(200, "A step description") }))
    .length(3),
});
export type HomepageInput = z.input<typeof homepageSchema>;

/** Stored JSON (possibly empty, old or partly invalid) → a complete config. */
export function resolveHomepage(stored: unknown): HomepageConfig {
  const s = (stored && typeof stored === "object" ? stored : {}) as Partial<HomepageConfig>;
  const merged = {
    ...DEFAULT_HOMEPAGE,
    ...s,
    // Drop rows for collections that no longer exist instead of rejecting the whole config.
    rows: Array.isArray(s.rows) ? s.rows.filter((r) => (ALL_COLLECTIONS as string[]).includes(r)) : DEFAULT_HOMEPAGE.rows,
    steps: Array.isArray(s.steps) && s.steps.length === 3 ? s.steps : DEFAULT_HOMEPAGE.steps,
  };
  const parsed = homepageSchema.safeParse(merged);
  return parsed.success ? { ...parsed.data, rows: [...new Set(parsed.data.rows)] } : DEFAULT_HOMEPAGE;
}

interface HeroProduct {
  id: string;
  image_back: string | null;
  is_featured: boolean;
}

/**
 * The top pictures: the owner's picks first (skipping jerseys that are hidden or
 * deleted), then empty slots filled from featured jerseys, then the rest in sort order.
 * Auto-filled middle tile shows the back (name + number) when there is one.
 */
export function pickHeroTiles<P extends HeroProduct>(hero: HeroTile[], products: P[]): { product: P; side: "front" | "back" }[] {
  const byId = new Map(products.map((p) => [p.id, p]));
  const tiles: { product: P; side: "front" | "back" }[] = [];
  const used = new Set<string>();
  for (const t of hero) {
    const product = byId.get(t.productId);
    if (!product || used.has(product.id) || tiles.length >= HERO_SLOTS) continue;
    tiles.push({ product, side: t.side === "back" && product.image_back ? "back" : "front" });
    used.add(product.id);
  }
  const fillers = [...products.filter((p) => p.is_featured), ...products].filter((p) => !used.has(p.id));
  for (const product of fillers) {
    if (tiles.length >= HERO_SLOTS) break;
    if (used.has(product.id)) continue;
    tiles.push({ product, side: tiles.length === 1 && product.image_back ? "back" : "front" });
    used.add(product.id);
  }
  return tiles;
}
