"use client";

import { Sheet } from "@/components/ui/Sheet";
import { useCartDrawer } from "@/store/cart";
import { CartContents } from "./CartContents";

/** Slides in after "Add to cart" so the customer can check out or keep shopping. */
export function CartDrawer() {
  const open = useCartDrawer((s) => s.open);
  const setOpen = useCartDrawer((s) => s.setOpen);
  const close = () => setOpen(false);

  return (
    <Sheet open={open} onClose={close} title="Your cart" side="right">
      {open && <CartContents variant="drawer" onNavigate={close} />}
    </Sheet>
  );
}
