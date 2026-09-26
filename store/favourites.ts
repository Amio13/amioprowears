import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

/**
 * Jerseys the shopper has hearted, saved on their device (no account needed).
 * Stores product IDs only; /favourites looks them up in the cached catalogue.
 */
export const MAX_FAVOURITES = 100;

interface FavouritesState {
  ids: string[];
  toggle: (productId: string) => void;
  remove: (productId: string) => void;
}

export const useFavourites = create<FavouritesState>()(
  persist(
    (set) => ({
      ids: [],
      // Newest first, so the favourites page shows the latest heart at the top.
      toggle: (productId) =>
        set((s) =>
          s.ids.includes(productId)
            ? { ids: s.ids.filter((id) => id !== productId) }
            : { ids: [productId, ...s.ids].slice(0, MAX_FAVOURITES) },
        ),
      remove: (productId) => set((s) => ({ ids: s.ids.filter((id) => id !== productId) })),
    }),
    {
      name: "apw-favourites",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      // Loaded after mount by <CartHydrator />, like the cart.
      skipHydration: true,
    },
  ),
);
