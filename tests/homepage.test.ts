import { describe, expect, it } from "vitest";
import { DEFAULT_HOMEPAGE, pickHeroTiles, resolveHomepage } from "@/lib/homepage";

const id = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;
const p = (n: number, o: { back?: boolean; featured?: boolean } = {}) => ({
  id: id(n),
  image_back: o.back === false ? null : `/b${n}.svg`,
  is_featured: o.featured ?? false,
});

describe("resolveHomepage", () => {
  it("uses the defaults for an empty or broken value", () => {
    expect(resolveHomepage({})).toEqual(DEFAULT_HOMEPAGE);
    expect(resolveHomepage(null)).toEqual(DEFAULT_HOMEPAGE);
    expect(resolveHomepage({ headline: 5 })).toEqual(DEFAULT_HOMEPAGE);
  });
  it("keeps the owner's choices and fills the rest", () => {
    const r = resolveHomepage({ headline: "Wear it.", rows: ["vintage", "vintage"], hero: [{ productId: id(1), side: "back" }] });
    expect(r.headline).toBe("Wear it.");
    expect(r.rows).toEqual(["vintage"]);
    expect(r.hero).toHaveLength(1);
    expect(r.steps).toEqual(DEFAULT_HOMEPAGE.steps);
  });
});

describe("pickHeroTiles", () => {
  const products = [p(1), p(2, { featured: true }), p(3, { back: false }), p(4)];
  it("shows exactly the owner's picks, in order", () => {
    const tiles = pickHeroTiles(
      [{ productId: id(4), side: "back" }, { productId: id(1), side: "front" }, { productId: id(3), side: "back" }],
      products,
    );
    expect(tiles.map((t) => [t.product.id, t.side])).toEqual([[id(4), "back"], [id(1), "front"], [id(3), "front"]]); // 3 has no back photo
  });
  it("skips hidden/deleted picks and fills empty slots, featured first", () => {
    const tiles = pickHeroTiles([{ productId: id(9), side: "front" }, { productId: id(3), side: "front" }], products);
    expect(tiles.map((t) => t.product.id)).toEqual([id(3), id(2), id(1)]);
    expect(tiles[1]!.side).toBe("back");
  });
  it("with no picks behaves like before (featured, then sort order)", () => {
    expect(pickHeroTiles([], products).map((t) => t.product.id)).toEqual([id(2), id(1), id(3)]);
  });

  it("drops unknown collection rows but keeps the rest of the owner's settings", () => {
    const r = resolveHomepage({ headline: "Wear it.", rows: ["top-clubs", "retired-collection", "kids"] });
    expect(r.headline).toBe("Wear it.");
    expect(r.rows).toEqual(["top-clubs", "kids"]);
  });
});
