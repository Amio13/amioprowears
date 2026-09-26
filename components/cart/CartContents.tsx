"use client";

import { ArrowLeft, Lock, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { buttonClasses } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { Spinner } from "@/components/ui/Spinner";
import { useCartHydrated } from "@/hooks/useCartHydrated";
import { useCartQuote } from "@/hooks/useCartQuote";
import { formatNaira } from "@/lib/format";
import { useCart } from "@/store/cart";
import { CartLineItem } from "./CartLineItem";

/** Cart lines + subtotal + checkout button. Used by /cart and the cart drawer. */
export function CartContents({ variant, onNavigate }: { variant: "page" | "drawer"; onNavigate?: () => void }) {
  const hydrated = useCartHydrated();
  const items = useCart((s) => s.items);
  const { quote, loading, error } = useCartQuote({ items, enabled: hydrated });

  if (!hydrated) {
    return (
      <div className="flex justify-center py-16">
        <Spinner label="Loading your cart" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="py-12 text-center">
        <ShoppingBag className="mx-auto mb-4 size-12 text-muted" strokeWidth={1.5} />
        <p className="text-lg font-bold">Your cart is empty</p>
        <p className="mt-1 text-muted">Pick a jersey and make it yours.</p>
        <Link href="/catalogue" onClick={onNavigate} className={buttonClasses({ className: "mt-6" })}>
          <ShoppingBag />
          Shop jerseys
        </Link>
      </div>
    );
  }

  // The quote matches lines by position. After a removal, positions shift until the
  // next quote arrives — only trust a priced line that is for the same jersey and choices.
  const priced = new Map(quote?.lines.map((l) => [l.index, l]));
  const pricedFor = (i: number) => {
    const p = priced.get(i);
    const item = items[i]!;
    return p &&
      p.productId === item.productId &&
      p.size === item.size &&
      (p.customName ?? "") === (item.customName ?? "") &&
      (p.customNumber ?? "") === (item.customNumber ?? "") &&
      (p.badgeId ?? "") === (item.badgeId ?? "")
      ? p
      : undefined;
  };
  const problems = new Map(quote?.problems.map((p) => [p.index, p.error]));
  const blocked = !quote || loading || Boolean(error) || problems.size > 0;
  const count = items.reduce((n, i) => n + i.quantity, 0);

  return (
    <div className={cn(variant === "page" && "lg:grid lg:grid-cols-[1fr_22rem] lg:items-start lg:gap-12")}>
      <ul className="divide-y divide-line border-y border-line">
        {items.map((item, i) => (
          <CartLineItem
            key={item.key}
            item={item}
            priced={pricedFor(i)}
            problem={problems.get(i)}
            compact={variant === "drawer"}
            onNavigate={onNavigate}
          />
        ))}
      </ul>

      <div className={cn("space-y-4 pt-6", variant === "page" && "lg:sticky lg:top-24 lg:rounded-2xl lg:bg-surface lg:p-6")}>
        {variant === "page" && <h2 className="text-lg font-bold">Summary</h2>}
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt>
              Subtotal ({count} {count === 1 ? "item" : "items"})
            </dt>
            <dd className="font-bold">{quote ? formatNaira(quote.subtotal) : "…"}</dd>
          </div>
          <div className="flex justify-between text-muted">
            <dt>Delivery to your motor park</dt>
            <dd>{quote ? `from ${formatNaira(quote.deliveryFrom)}` : "…"}</dd>
          </div>
        </dl>
        <p className="text-xs text-muted">Delivery depends on your state and is added at checkout.</p>

        {error && (
          <p role="alert" className="text-sm text-brand">
            {error}
          </p>
        )}
        {problems.size > 0 && (
          <p role="alert" className="text-sm text-brand">
            Please fix or remove the items marked above to continue.
          </p>
        )}

        <Link
          href="/checkout"
          onClick={(e) => {
            if (blocked) e.preventDefault();
            else onNavigate?.();
          }}
          aria-disabled={blocked}
          className={buttonClasses({ size: "lg", className: cn("w-full", blocked && "pointer-events-none opacity-50") })}
        >
          {loading ? <Spinner className="size-4" /> : <Lock />}
          Go to checkout
        </Link>
        {variant === "drawer" ? (
          <Link href="/cart" onClick={onNavigate} className={buttonClasses({ variant: "secondary", className: "w-full" })}>
            <ShoppingBag />
            View cart
          </Link>
        ) : (
          <Link href="/catalogue" className="flex min-h-11 items-center justify-center gap-1.5 text-sm underline underline-offset-4 hover:text-brand">
            <ArrowLeft className="size-4" />
            Continue shopping
          </Link>
        )}
      </div>
    </div>
  );
}
