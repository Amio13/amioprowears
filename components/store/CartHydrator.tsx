"use client";

import { useEffect } from "react";
import { useCart } from "@/store/cart";

/** Loads the saved cart from localStorage once the page has mounted. */
export function CartHydrator() {
  useEffect(() => {
    void useCart.persist.rehydrate();
  }, []);
  return null;
}
