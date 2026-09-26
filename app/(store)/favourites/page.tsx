import type { Metadata } from "next";
import { FavouritesList } from "@/components/store/FavouritesList";
import { getActiveProducts } from "@/lib/products";

export const metadata: Metadata = { title: "Your favourites", robots: { index: false } };

// Static like the catalogue: favourites live in the browser, which picks them
// out of this cached product list, so no server work per visit.
export const revalidate = 300;

export default async function FavouritesPage() {
  const products = await getActiveProducts();
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:py-10">
      <h1 className="mb-6 font-display text-5xl leading-none tracking-wide">Your favourites</h1>
      <FavouritesList products={products} />
    </div>
  );
}
