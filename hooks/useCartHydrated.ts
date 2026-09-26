"use client";

import { useEffect, useState } from "react";
import { useCart } from "@/store/cart";
import { useFavourites } from "@/store/favourites";

type PersistedStore = typeof useCart | typeof useFavourites;

function useHydrated(store: PersistedStore): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    // Checked after mount (not during render) so server and first client render match.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing with an external store
    setHydrated(store.persist.hasHydrated());
    return store.persist.onFinishHydration(() => setHydrated(true));
  }, [store]);
  return hydrated;
}

/**
 * True once the saved cart has loaded from localStorage. Until then the cart is
 * "empty" only because it hasn't loaded, so pages show a loading state instead.
 */
export const useCartHydrated = () => useHydrated(useCart);

/** Same, for the saved favourites. */
export const useFavouritesHydrated = () => useHydrated(useFavourites);
