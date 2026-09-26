"use client";

import { Heart, ShoppingBag } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { selectCartCount, useCart } from "@/store/cart";
import { useFavourites } from "@/store/favourites";

export function CartLink() {
  const count = useCart(selectCartCount);
  return (
    <HeaderIconLink
      href="/cart"
      count={count}
      label={count > 0 ? `Cart, ${count} item${count === 1 ? "" : "s"}` : "Cart, empty"}
    >
      <ShoppingBag className="size-6" strokeWidth={1.8} />
    </HeaderIconLink>
  );
}

export function FavouritesLink() {
  const count = useFavourites((s) => s.ids.length);
  return (
    <HeaderIconLink href="/favourites" count={count} label={count > 0 ? `Favourites, ${count} saved` : "Favourites"}>
      <Heart className="size-6" strokeWidth={1.8} />
    </HeaderIconLink>
  );
}

function HeaderIconLink({ href, count, label, children }: { href: string; count: number; label: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="relative inline-flex size-11 items-center justify-center rounded-full hover:bg-surface-strong"
      aria-label={label}
    >
      {children}
      {count > 0 && (
        <span className="absolute right-0.5 top-0.5 flex min-w-5 items-center justify-center rounded-full bg-brand px-1 text-xs font-bold leading-5 text-white">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
