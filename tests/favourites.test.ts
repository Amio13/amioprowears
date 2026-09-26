import { beforeEach, describe, expect, it } from "vitest";
import { MAX_FAVOURITES, useFavourites } from "@/store/favourites";

// Tests run in Node without localStorage; persistence is skipped (skipHydration)
// so this exercises the in-memory logic only.
const state = () => useFavourites.getState();

describe("favourites", () => {
  beforeEach(() => useFavourites.setState({ ids: [] }));

  it("toggles a jersey on and off", () => {
    state().toggle("a");
    expect(state().ids).toEqual(["a"]);
    state().toggle("a");
    expect(state().ids).toEqual([]);
  });

  it("puts the newest heart first", () => {
    state().toggle("a");
    state().toggle("b");
    expect(state().ids).toEqual(["b", "a"]);
  });

  it("removes one jersey", () => {
    state().toggle("a");
    state().toggle("b");
    state().remove("a");
    expect(state().ids).toEqual(["b"]);
  });

  it("keeps at most MAX_FAVOURITES, dropping the oldest", () => {
    for (let i = 0; i <= MAX_FAVOURITES; i++) state().toggle(`p${i}`);
    expect(state().ids).toHaveLength(MAX_FAVOURITES);
    expect(state().ids[0]).toBe(`p${MAX_FAVOURITES}`);
    expect(state().ids).not.toContain("p0");
  });
});
