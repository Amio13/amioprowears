"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/components/ui/cn";
import { describeCustomisation } from "@/lib/customizer";
import { formatNaira } from "@/lib/format";
import type { PricedLine } from "@/lib/order-pricing";
import { MAX_QUANTITY_PER_LINE, useCart, type CartItem } from "@/store/cart";

/**
 * One cart line. `priced` comes from the server quote; while it loads (or if the
 * line has a problem) we still show what we know from the cart itself.
 */
export function CartLineItem({
  item,
  priced,
  problem,
  editable = true,
  compact = false,
  onNavigate,
}: {
  item: CartItem;
  priced?: PricedLine;
  problem?: string;
  editable?: boolean;
  compact?: boolean;
  onNavigate?: () => void;
}) {
  const setQuantity = useCart((s) => s.setQuantity);
  const remove = useCart((s) => s.remove);
  const custom = describeCustomisation({
    customName: item.customName,
    customNumber: item.customNumber,
    badgeName: priced?.badgeName ?? (item.badgeId ? "Badge" : null),
  });
  const name = priced?.productName ?? "Jersey";

  return (
    <li className={cn("flex gap-3 py-4", compact && "py-3")}>
      <div className={cn("relative shrink-0 overflow-hidden rounded-lg bg-surface", compact ? "h-20 w-16" : "h-28 w-[5.6rem]")}>
        {priced && <Image src={priced.image} alt="" fill sizes="96px" className="object-contain" unoptimized />}
      </div>

      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex justify-between gap-3">
          {priced ? (
            <Link
              href={`/jersey/${priced.slug}`}
              onClick={onNavigate}
              className="line-clamp-2 text-sm font-medium hover:underline hover:underline-offset-4"
            >
              {name}
            </Link>
          ) : (
            <span className={cn("text-sm font-medium", !problem && "animate-pulse text-muted")}>{problem ? "Unavailable jersey" : "Loading…"}</span>
          )}
          {priced && <span className="shrink-0 text-sm font-bold">{formatNaira(priced.lineTotal)}</span>}
        </div>
        <p className="text-xs text-muted">
          Size {item.size}
          {custom && ` · ${custom}`}
          {!editable && ` · Qty ${item.quantity}`}
        </p>
        {priced && item.quantity > 1 && (
          <p className="text-xs text-muted">{formatNaira(priced.lineTotal / priced.quantity)} each</p>
        )}
        {problem && (
          <p role="alert" className="text-sm text-brand">
            {problem}
          </p>
        )}

        {editable && (
          <div className="flex items-center justify-between pt-1">
            <div className="inline-flex items-center rounded-full border border-line" role="group" aria-label={`Quantity for ${name}`}>
              <StepButton
                label="Decrease quantity"
                disabled={item.quantity <= 1}
                onClick={() => setQuantity(item.key, item.quantity - 1)}
              >
                <Minus className="size-4" />
              </StepButton>
              <span className="min-w-8 text-center text-sm font-medium" aria-live="polite">
                {item.quantity}
              </span>
              <StepButton
                label="Increase quantity"
                disabled={item.quantity >= MAX_QUANTITY_PER_LINE}
                onClick={() => setQuantity(item.key, item.quantity + 1)}
              >
                <Plus className="size-4" />
              </StepButton>
            </div>
            <button
              type="button"
              onClick={() => remove(item.key)}
              className="inline-flex min-h-11 items-center gap-1.5 px-2 text-sm text-muted hover:text-brand"
            >
              <Trash2 className="size-4" />
              Remove
            </button>
          </div>
        )}
      </div>
    </li>
  );
}

function StepButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="inline-flex size-11 items-center justify-center rounded-full text-lg hover:bg-surface-strong disabled:opacity-30"
    >
      {children}
    </button>
  );
}
