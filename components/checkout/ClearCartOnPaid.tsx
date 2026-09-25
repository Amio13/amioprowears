"use client";

import { useEffect } from "react";
import { useCart } from "@/store/cart";

const KEY = "apw-cleared-orders";

/**
 * Empties the cart once an order is paid. Remembers which orders already did this,
 * so revisiting an old confirmation page never wipes a new cart.
 */
export function ClearCartOnPaid({ orderId }: { orderId: string }) {
  useEffect(() => {
    try {
      const done: string[] = JSON.parse(localStorage.getItem(KEY) ?? "[]");
      if (done.includes(orderId)) return;
      const clear = () => {
        useCart.getState().clear();
        localStorage.setItem(KEY, JSON.stringify([...done.slice(-19), orderId]));
      };
      if (useCart.persist.hasHydrated()) clear();
      else return useCart.persist.onFinishHydration(clear);
    } catch {
      // storage blocked — nothing to clear
    }
  }, [orderId]);
  return null;
}
