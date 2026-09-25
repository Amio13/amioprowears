"use client";

import Link from "next/link";
import { selectCartCount, useCart } from "@/store/cart";

export function CartLink() {
  const count = useCart(selectCartCount);

  return (
    <Link
      href="/cart"
      className="relative inline-flex size-11 items-center justify-center rounded-full hover:bg-surface-strong"
      aria-label={count > 0 ? `Cart, ${count} item${count === 1 ? "" : "s"}` : "Cart, empty"}
    >
      <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M6 7h12l-1 13H7L6 7Z" strokeLinejoin="round" />
        <path d="M9 7a3 3 0 0 1 6 0" />
      </svg>
      {count > 0 && (
        <span className="absolute right-0.5 top-0.5 flex min-w-5 items-center justify-center rounded-full bg-brand px-1 text-xs font-bold leading-5 text-white">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
