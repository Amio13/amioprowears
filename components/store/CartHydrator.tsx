"use client";

import { useEffect } from "react";
import { useCart } from "@/store/cart";
import { useFavourites } from "@/store/favourites";

/** Loads the saved cart and favourites from localStorage once the page has mounted. */
export function CartHydrator() {
  useEffect(() => {
    void useCart.persist.rehydrate();
    void useFavourites.persist.rehydrate();
  }, []);
  return null;
}
