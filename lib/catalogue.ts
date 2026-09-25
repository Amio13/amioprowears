/**
 * Catalogue filtering and sorting. Pure functions (no React, no DB) so the same
 * code runs in the browser and in tests.
 *
 * Filters live in the URL, comma-separated within a group:
 *   /catalogue?club=arsenal,nigeria&gender=female&size=M&min=10000&sort=price-asc
 * Groups combine with AND; values inside a group combine with OR.
 */
import { effectivePrice } from "./pricing";
import type { CollectionSlug, Era, Gender, JerseyType, Product } from "@/types";

/** The product fields the catalogue grid and cards need (keeps the page payload small). */
export type CatalogueProduct = Pick<
  Product,
  | "id"
  | "slug"
  | "name"
  | "club"
  | "gender"
  | "type"
  | "era"
  | "season"
  | "collections"
  | "sizes"
  | "out_of_stock_sizes"
  | "price"
  | "sale_price"
  | "image_front"
  | "image_back"
  | "created_at"
  | "sort_order"
  | "is_featured"
>;

export const CATALOGUE_PRODUCT_COLUMNS =
  "id, slug, name, club, gender, type, era, season, collections, sizes, out_of_stock_sizes, " +
  "price, sale_price, image_front, image_back, created_at, sort_order, is_featured";

export const COLLECTION_LABELS: Record<CollectionSlug, string> = {
  "new-arrivals": "New arrivals",
  "super-eagles": "Super Eagles",
  "champions-league": "Champions League",
  "female-kits": "Female kits",
  vintage: "Vintage collection",
};
export const GENDER_LABELS: Record<Gender, string> = { male: "Men", female: "Women", kids: "Kids" };
export const TYPE_LABELS: Record<JerseyType, string> = { player: "Player version", fan: "Fan version" };
export const ERA_LABELS: Record<Era, string> = { current: "Current", vintage: "Vintage" };

export const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
] as const;
export type SortKey = (typeof SORT_OPTIONS)[number]["value"];
const DEFAULT_SORT: SortKey = "newest";

export interface CatalogueFilters {
  collection: CollectionSlug[];
  club: string[]; // club slugs, e.g. "real-madrid"
  gender: Gender[];
  type: JerseyType[];
  era: Era[];
  size: string[];
  min: number | null; // naira, inclusive
  max: number | null;
  sort: SortKey;
}

/** The list-valued filter groups, in the order they appear in the URL and the sidebar. */
export const LIST_GROUPS = ["collection", "club", "gender", "type", "era", "size"] as const;
export type ListGroup = (typeof LIST_GROUPS)[number];

export const EMPTY_FILTERS: CatalogueFilters = {
  collection: [],
  club: [],
  gender: [],
  type: [],
  era: [],
  size: [],
  min: null,
  max: null,
  sort: DEFAULT_SORT,
};

/** "Manchester United" → "manchester-united". */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ---------------------------------------------------------------------------
// URL <-> filters
// ---------------------------------------------------------------------------

/** Anything with URLSearchParams-style getAll (URLSearchParams, Next's ReadonlyURLSearchParams). */
interface ParamsLike {
  getAll(name: string): string[];
  get(name: string): string | null;
}

const isOneOf = <T extends string>(allowed: readonly T[]) => (v: string): v is T =>
  (allowed as readonly string[]).includes(v);

/**
 * All values for a key, accepting both `a,b` and repeated `?k=a&k=b`.
 * Normalised, then deduplicated (order kept).
 */
function listParam(params: ParamsLike, key: string, normalise: (v: string) => string): string[] {
  const values = params
    .getAll(key)
    .flatMap((v) => v.split(","))
    .map((v) => normalise(v.trim()))
    .filter(Boolean);
  return [...new Set(values)];
}

function amountParam(params: ParamsLike, key: string): number | null {
  const raw = params.get(key);
  if (!raw || !/^\d{1,9}$/.test(raw.trim())) return null;
  return Number(raw.trim());
}

/** Read filters from the URL. Unknown or invalid values are dropped, never thrown. */
export function parseFilters(params: ParamsLike): CatalogueFilters {
  const lower = (key: string) => listParam(params, key, (v) => v.toLowerCase());
  const sort = params.get("sort");
  return {
    collection: lower("collection").filter(isOneOf(Object.keys(COLLECTION_LABELS) as CollectionSlug[])),
    club: listParam(params, "club", slugify),
    gender: lower("gender").filter(isOneOf(Object.keys(GENDER_LABELS) as Gender[])),
    type: lower("type").filter(isOneOf(Object.keys(TYPE_LABELS) as JerseyType[])),
    era: lower("era").filter(isOneOf(Object.keys(ERA_LABELS) as Era[])),
    // Sizes are case-sensitive labels like "M" or "10-11Y"; normalise to upper case.
    size: listParam(params, "size", (v) => v.toUpperCase()),
    min: amountParam(params, "min"),
    max: amountParam(params, "max"),
    sort: SORT_OPTIONS.some((o) => o.value === sort) ? (sort as SortKey) : DEFAULT_SORT,
  };
}

/** Filters → query string without the "?" ("" when nothing is set). Stable key order. */
export function filtersToQuery(f: CatalogueFilters): string {
  const parts: string[] = [];
  for (const group of LIST_GROUPS) {
    if (f[group].length) parts.push(`${group}=${f[group].map(encodeURIComponent).join(",")}`);
  }
  if (f.min !== null) parts.push(`min=${f.min}`);
  if (f.max !== null) parts.push(`max=${f.max}`);
  if (f.sort !== DEFAULT_SORT) parts.push(`sort=${f.sort}`);
  return parts.join("&");
}

/** Add the value if missing, remove it if present. */
export function toggleValue(f: CatalogueFilters, group: ListGroup, value: string): CatalogueFilters {
  const current = f[group] as string[];
  const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
  return { ...f, [group]: next };
}

/** Number of active filters (sort doesn't count) — for the "Filters (3)" button. */
export function countActiveFilters(f: CatalogueFilters): number {
  return (
    LIST_GROUPS.reduce((n, g) => n + f[g].length, 0) + (f.min !== null ? 1 : 0) + (f.max !== null ? 1 : 0)
  );
}

// ---------------------------------------------------------------------------
// Filtering and sorting
// ---------------------------------------------------------------------------

export function inStockSizes(p: Pick<CatalogueProduct, "sizes" | "out_of_stock_sizes">): string[] {
  return p.sizes.filter((s) => !p.out_of_stock_sizes.includes(s));
}

/** True if the product passes every active filter group (AND), matching any value within a group (OR). */
export function matchesFilters(p: CatalogueProduct, f: CatalogueFilters): boolean {
  const any = <T>(selected: T[], test: (v: T) => boolean) => selected.length === 0 || selected.some(test);
  const price = effectivePrice(p);
  const clubSlug = slugify(p.club);
  const stock = inStockSizes(p).map((s) => s.toUpperCase());

  return (
    any(f.collection, (c) => p.collections.includes(c)) &&
    any(f.club, (c) => c === clubSlug) &&
    any(f.gender, (g) => g === p.gender) &&
    any(f.type, (t) => t === p.type) &&
    any(f.era, (e) => e === p.era) &&
    any(f.size, (s) => stock.includes(s)) &&
    (f.min === null || price >= f.min) &&
    (f.max === null || price <= f.max)
  );
}

export function sortProducts<T extends CatalogueProduct>(products: T[], sort: SortKey): T[] {
  const byOrder = (a: T, b: T) => a.sort_order - b.sort_order || a.name.localeCompare(b.name);
  const compare: Record<SortKey, (a: T, b: T) => number> = {
    newest: (a, b) => b.created_at.localeCompare(a.created_at) || byOrder(a, b),
    "price-asc": (a, b) => effectivePrice(a) - effectivePrice(b) || byOrder(a, b),
    "price-desc": (a, b) => effectivePrice(b) - effectivePrice(a) || byOrder(a, b),
  };
  return [...products].sort(compare[sort]);
}

export function applyFilters<T extends CatalogueProduct>(products: T[], f: CatalogueFilters): T[] {
  return sortProducts(
    products.filter((p) => matchesFilters(p, f)),
    f.sort,
  );
}

// ---------------------------------------------------------------------------
// Filter options shown in the sidebar (derived from the products we actually have)
// ---------------------------------------------------------------------------

export interface FilterOption {
  value: string;
  label: string;
}

const ADULT_SIZES = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "3XL", "XXXL", "4XL"];

/** Adult sizes in their natural order, then kids' sizes by age, then anything else A–Z. */
export function compareSizes(a: string, b: string): number {
  const rank = (s: string) => {
    const adult = ADULT_SIZES.indexOf(s.toUpperCase());
    if (adult !== -1) return [0, adult] as const;
    const age = /^(\d+)/.exec(s);
    if (age) return [1, Number(age[1])] as const;
    return [2, 0] as const;
  };
  const [ga, ra] = rank(a);
  const [gb, rb] = rank(b);
  return ga - gb || ra - rb || a.localeCompare(b);
}

export function getFilterOptions(products: CatalogueProduct[]): Record<ListGroup, FilterOption[]> {
  const present = <T extends string>(labels: Record<T, string>, used: Set<string>) =>
    (Object.keys(labels) as T[]).filter((k) => used.has(k)).map((k) => ({ value: k, label: labels[k] }));

  const clubs = new Map<string, string>();
  for (const p of products) clubs.set(slugify(p.club), p.club);

  const sizes = new Set(products.flatMap((p) => p.sizes.map((s) => s.toUpperCase())));

  return {
    collection: present(COLLECTION_LABELS, new Set(products.flatMap((p) => p.collections))),
    club: [...clubs].map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label)),
    gender: present(GENDER_LABELS, new Set(products.map((p) => p.gender))),
    type: present(TYPE_LABELS, new Set(products.map((p) => p.type))),
    era: present(ERA_LABELS, new Set(products.map((p) => p.era))),
    size: [...sizes].sort(compareSizes).map((s) => ({ value: s, label: s })),
  };
}

export const GROUP_LABELS: Record<ListGroup, string> = {
  collection: "Collection",
  club: "Club",
  gender: "Gender",
  type: "Type",
  era: "Era",
  size: "Size in stock",
};
