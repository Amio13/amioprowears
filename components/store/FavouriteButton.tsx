"use client";

import { Heart } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { useFavourites } from "@/store/favourites";

/**
 * Heart toggle that floats over a jersey photo (cards and the product page).
 * Shows an empty heart until saved favourites load after mount, so server HTML matches.
 */
export function FavouriteButton({
  productId,
  productName,
  className,
}: {
  productId: string;
  productName: string;
  className?: string;
}) {
  const saved = useFavourites((s) => s.ids.includes(productId));
  const toggle = useFavourites((s) => s.toggle);

  return (
    <button
      type="button"
      onClick={() => toggle(productId)}
      // A toggle keeps one label; screen readers announce "pressed" when it's saved.
      aria-pressed={saved}
      aria-label={`Save ${productName} to favourites`}
      title={saved ? "Remove from favourites" : "Save to favourites"}
      className={cn(
        "inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur transition-colors hover:bg-white",
        className,
      )}
    >
      <Heart
        className={cn("size-5 transition-transform active:scale-90", saved ? "fill-brand text-brand" : "text-ink")}
        strokeWidth={2}
      />
    </button>
  );
}
