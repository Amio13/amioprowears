"use client";

import { Heart, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { buttonClasses } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { useFavouritesHydrated } from "@/hooks/useCartHydrated";
import type { CatalogueProduct } from "@/lib/catalogue";
import { useFavourites } from "@/store/favourites";
import { JerseyCard } from "./JerseyCard";

/** The shopper's hearted jerseys, picked from the (cached) list of active products. */
export function FavouritesList({ products }: { products: CatalogueProduct[] }) {
  const hydrated = useFavouritesHydrated();
  const ids = useFavourites((s) => s.ids);
  const remove = useFavourites((s) => s.remove);

  if (!hydrated) {
    return (
      <div className="flex justify-center py-16">
        <Spinner label="Loading your favourites" />
      </div>
    );
  }

  const byId = new Map(products.map((p) => [p.id, p]));
  const saved = ids.map((id) => byId.get(id)).filter((p): p is CatalogueProduct => Boolean(p));
  // Hearted jerseys the owner has since hidden or deleted.
  const gone = ids.filter((id) => !byId.has(id));

  return (
    <>
      {gone.length > 0 && (
        <p className="mb-6 flex flex-wrap items-center gap-x-3 rounded-2xl bg-surface p-4 text-sm">
          {gone.length === 1 ? "1 saved jersey is" : `${gone.length} saved jerseys are`} no longer in the store.
          <button
            type="button"
            onClick={() => gone.forEach(remove)}
            className="inline-flex min-h-11 items-center font-medium underline underline-offset-4 hover:text-brand"
          >
            Remove {gone.length === 1 ? "it" : "them"}
          </button>
        </p>
      )}

      {saved.length === 0 ? (
        <div className="py-12 text-center">
          <Heart className="mx-auto size-12 text-muted" strokeWidth={1.5} />
          <p className="mt-4 text-lg font-bold">No favourites yet</p>
          <p className="mt-1 text-muted">Tap the heart on any jersey to save it here for later.</p>
          <Link href="/catalogue" className={buttonClasses({ className: "mt-6" })}>
            <ShoppingBag />
            Shop jerseys
          </Link>
        </div>
      ) : (
        <>
          <p className="mb-4 text-sm text-muted">
            {saved.length} saved {saved.length === 1 ? "jersey" : "jerseys"} · saved on this device
          </p>
          <ul className="grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
            {saved.map((p) => (
              <li key={p.id}>
                <JerseyCard product={p} />
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
