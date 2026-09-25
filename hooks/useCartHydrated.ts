"use client";

import { useEffect, useState } from "react";
import { useCart } from "@/store/cart";

/**
 * True once the saved cart has loaded from localStorage. Until then the cart is
 * "empty" only because it hasn't loaded, so pages show a loading state instead.
 */
export function useCartHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    // Checked after mount (not during render) so server and first client render match.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing with an external store
    setHydrated(useCart.persist.hasHydrated());
    return useCart.persist.onFinishHydration(() => setHydrated(true));
  }, []);
  return hydrated;
}
