import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

/**
 * Cart holds IDs and choices only — never prices. The server recalculates every
 * price from the database at checkout (CLAUDE.md rule 2).
 */
export interface CartItem {
  /** Same product + size + customisation = same line (quantities merge). */
  key: string;
  productId: string;
  size: string;
  customName?: string;
  customNumber?: string;
  badgeId?: string;
  quantity: number;
}

export type NewCartItem = Omit<CartItem, "key" | "quantity"> & { quantity?: number };

export const MAX_QUANTITY_PER_LINE = 20;

export const cartItemKey = (i: Omit<CartItem, "key" | "quantity">) =>
  [i.productId, i.size, i.customName ?? "", i.customNumber ?? "", i.badgeId ?? ""].join("|");

interface CartState {
  items: CartItem[];
  add: (item: NewCartItem) => void;
  setQuantity: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  clear: () => void;
}

const clampQty = (n: number) => Math.max(1, Math.min(MAX_QUANTITY_PER_LINE, Math.floor(n)));

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      add: ({ quantity = 1, ...item }) =>
        set((s) => {
          const key = cartItemKey(item);
          const existing = s.items.find((i) => i.key === key);
          if (existing) {
            return {
              items: s.items.map((i) =>
                i.key === key ? { ...i, quantity: clampQty(i.quantity + quantity) } : i,
              ),
            };
          }
          return { items: [...s.items, { ...item, key, quantity: clampQty(quantity) }] };
        }),
      setQuantity: (key, quantity) =>
        set((s) => ({
          items: s.items.map((i) => (i.key === key ? { ...i, quantity: clampQty(quantity) } : i)),
        })),
      remove: (key) => set((s) => ({ items: s.items.filter((i) => i.key !== key) })),
      clear: () => set({ items: [] }),
    }),
    {
      name: "apw-cart",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      // Loaded from localStorage after mount by <CartHydrator />, so the server
      // HTML and the first client render match (both show an empty cart).
      skipHydration: true,
    },
  ),
);

export const selectCartCount = (s: CartState) => s.items.reduce((n, i) => n + i.quantity, 0);

/** Cart lines as the API expects them (drops the local-only `key`). */
export const toApiLines = (items: CartItem[]) =>
  items.map(({ productId, size, customName, customNumber, badgeId, quantity }) => ({
    productId,
    size,
    customName,
    customNumber,
    badgeId,
    quantity,
  }));

/** Slide-in cart drawer, opened after "Add to cart". */
export const useCartDrawer = create<{ open: boolean; setOpen: (open: boolean) => void }>()((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}));
