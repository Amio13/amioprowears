import { describe, expect, it } from "vitest";
import {
  applyFilters,
  compareSizes,
  countActiveFilters,
  EMPTY_FILTERS,
  filtersToQuery,
  getFilterOptions,
  parseFilters,
  productCollections,
  slugify,
  toggleValue,
  type CatalogueProduct,
} from "@/lib/catalogue";

const product = (overrides: Partial<CatalogueProduct> & Pick<CatalogueProduct, "slug">): CatalogueProduct => ({
  id: overrides.slug,
  name: overrides.slug,
  club: "Nigeria",
  gender: "male",
  type: "fan",
  era: "current",
  season: "2025/26",
  collections: [],
  sizes: ["S", "M", "L", "XL", "XXL"],
  out_of_stock_sizes: [],
  price: 15350,
  sale_price: null,
  image_front: "/f.svg",
  image_back: null,
  created_at: "2026-09-01T00:00:00Z",
  sort_order: 0,
  is_featured: false,
  ...overrides,
});

// Mirrors the seed data (supabase/migrations/0003_seed.sql).
const PRODUCTS: CatalogueProduct[] = [
  product({ slug: "ng-home", collections: ["new-arrivals", "super-eagles", "national-teams"], sort_order: 1 }),
  product({
    slug: "ng-away-w",
    gender: "female",
    collections: ["super-eagles", "national-teams"], // Females is automatic (gender)
    sizes: ["XS", "S", "M", "L", "XL"],
    out_of_stock_sizes: ["XS"],
    sale_price: 13850,
    sort_order: 2,
  }),
  product({ slug: "arsenal", club: "Arsenal", type: "player", price: 20450, collections: ["new-arrivals", "champions-league", "top-clubs"], sort_order: 3 }),
  product({ slug: "real", club: "Real Madrid", out_of_stock_sizes: ["XXL"], collections: ["champions-league", "top-clubs"], sort_order: 4 }),
  product({
    slug: "utd-kids",
    club: "Manchester United",
    gender: "kids",
    price: 12300,
    sizes: ["4-5Y", "6-7Y", "8-9Y", "10-11Y", "12-13Y"],
    collections: ["new-arrivals", "top-clubs"],
    sort_order: 5,
  }),
  product({ slug: "ng-1994", era: "vintage", price: 25500, collections: ["super-eagles", "national-teams"], sort_order: 6, created_at: "2026-09-10T00:00:00Z" }),
];

const run = (query: string) => applyFilters(PRODUCTS, parseFilters(new URLSearchParams(query))).map((p) => p.slug);

describe("parseFilters", () => {
  it("returns defaults for an empty URL", () => {
    expect(parseFilters(new URLSearchParams(""))).toEqual(EMPTY_FILTERS);
  });

  it("reads comma-separated and repeated values, lower-cases enums, dedupes", () => {
    const f = parseFilters(new URLSearchParams("club=Arsenal,real-madrid&club=arsenal&gender=FEMALE&size=m,xl"));
    expect(f.club).toEqual(["arsenal", "real-madrid"]);
    expect(f.gender).toEqual(["female"]);
    expect(f.size).toEqual(["M", "XL"]);
  });

  it("drops invalid values instead of failing", () => {
    const f = parseFilters(new URLSearchParams("gender=robot&type=fan&era=future&collection=nope&min=abc&max=-5&sort=random"));
    expect(f.gender).toEqual([]);
    expect(f.type).toEqual(["fan"]);
    expect(f.era).toEqual([]);
    expect(f.collection).toEqual([]);
    expect(f.min).toBeNull();
    expect(f.max).toBeNull();
    expect(f.sort).toBe("newest");
  });

  it("round-trips through filtersToQuery", () => {
    const query = "collection=super-eagles&club=arsenal,nigeria&gender=female&size=M&min=10000&max=20000&sort=price-asc";
    const f = parseFilters(new URLSearchParams(query));
    expect(filtersToQuery(f)).toBe(query);
    expect(parseFilters(new URLSearchParams(filtersToQuery(f)))).toEqual(f);
  });

  it("omits defaults from the query string", () => {
    expect(filtersToQuery(EMPTY_FILTERS)).toBe("");
  });
});

describe("applyFilters — AND across groups, OR within a group", () => {
  it("shows everything with no filters", () => {
    expect(run("")).toHaveLength(6);
  });

  it("OR within a group", () => {
    expect(run("club=arsenal,real-madrid").sort()).toEqual(["arsenal", "real"]);
    expect(run("gender=female,kids").sort()).toEqual(["ng-away-w", "utd-kids"]);
  });

  it("AND across groups", () => {
    expect(run("club=nigeria&gender=female")).toEqual(["ng-away-w"]);
    expect(run("club=nigeria&era=vintage")).toEqual(["ng-1994"]);
    expect(run("collection=new-arrivals&type=player")).toEqual(["arsenal"]);
    expect(run("club=arsenal&gender=female")).toEqual([]);
  });

  it("OR and AND together", () => {
    // (Nigeria OR Arsenal) AND (Champions League OR Vintage)
    expect(run("club=nigeria,arsenal&collection=champions-league,vintage").sort()).toEqual(["arsenal", "ng-1994"]);
  });

  it("size filter only matches sizes that are in stock", () => {
    expect(run("size=XXL")).not.toContain("real"); // Real Madrid XXL is out of stock
    expect(run("size=XS")).toEqual([]); // the only XS is out of stock
    expect(run("size=10-11y")).toEqual(["utd-kids"]);
  });

  it("price range uses the sale price when there is one", () => {
    // ng-away-w is ₦15,350 but on sale for ₦13,850
    expect(run("max=14000").sort()).toEqual(["ng-away-w", "utd-kids"]);
    expect(run("min=15000&max=16000").sort()).toEqual(["ng-home", "real"]);
    expect(run("min=20450")).toEqual(["ng-1994", "arsenal"]); // inclusive
  });
});

describe("sorting", () => {
  it("newest first, ties broken by sort order", () => {
    expect(run("")).toEqual(["ng-1994", "ng-home", "ng-away-w", "arsenal", "real", "utd-kids"]);
  });

  it("price low → high and high → low use the effective price", () => {
    expect(run("sort=price-asc")).toEqual(["utd-kids", "ng-away-w", "ng-home", "real", "arsenal", "ng-1994"]);
    expect(run("sort=price-desc")).toEqual(["ng-1994", "arsenal", "ng-home", "real", "ng-away-w", "utd-kids"]);
  });
});

describe("helpers", () => {
  it("slugify", () => {
    expect(slugify("Manchester United")).toBe("manchester-united");
    expect(slugify("  Atlético  Madrid ")).toBe("atletico-madrid");
  });

  it("toggleValue adds then removes", () => {
    const on = toggleValue(EMPTY_FILTERS, "club", "arsenal");
    expect(on.club).toEqual(["arsenal"]);
    expect(toggleValue(on, "club", "arsenal").club).toEqual([]);
  });

  it("countActiveFilters ignores sort", () => {
    expect(countActiveFilters(parseFilters(new URLSearchParams("club=a,b&gender=male&min=1&sort=price-asc")))).toBe(4);
  });

  it("compareSizes orders adult sizes, then kids by age", () => {
    expect(["XL", "10-11Y", "S", "4-5Y", "XXL", "M"].sort(compareSizes)).toEqual(["S", "M", "XL", "XXL", "4-5Y", "10-11Y"]);
  });

  it("getFilterOptions lists only what exists", () => {
    const o = getFilterOptions(PRODUCTS);
    expect(o.club.map((c) => c.label)).toEqual(["Arsenal", "Manchester United", "Nigeria", "Real Madrid"]);
    expect(o.gender.map((g) => g.value)).toEqual(["male", "female", "kids"]);
    expect(o.size[0]!.value).toBe("XS");
  });

  it("Females, Kids and Vintage come from gender and era; Top clubs/National teams from ticks", () => {
    expect(run("collection=female-kits")).toEqual(["ng-away-w"]);
    expect(run("collection=kids")).toEqual(["utd-kids"]);
    expect(run("collection=vintage")).toEqual(["ng-1994"]);
    expect(run("collection=top-clubs").sort()).toEqual(["arsenal", "real", "utd-kids"]);
    expect(run("collection=national-teams").sort()).toEqual(["ng-1994", "ng-away-w", "ng-home"]);
  });

  it("ignores old ticks for automatic collections", () => {
    // A men's current jersey that was once ticked "Female kits" and "Vintage".
    const legacy = product({ slug: "old", collections: ["female-kits", "vintage", "new-arrivals"] as never });
    expect(productCollections(legacy)).toEqual(["new-arrivals"]);
    expect(productCollections({ collections: [], gender: "female", era: "vintage" })).toEqual(["female-kits", "vintage"]);
  });

  it("only offers collections that have jerseys, in display order", () => {
    expect(getFilterOptions(PRODUCTS).collection.map((o) => o.value)).toEqual([
      "top-clubs", "national-teams", "female-kits", "kids", "vintage", "new-arrivals", "super-eagles", "champions-league",
    ]);
  });
});
