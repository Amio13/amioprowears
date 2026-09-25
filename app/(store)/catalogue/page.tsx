import type { Metadata } from "next";
import { Suspense } from "react";
import { CatalogueFromUrl, CatalogueView } from "@/components/store/CatalogueView";
import { EMPTY_FILTERS, getFilterOptions } from "@/lib/catalogue";
import { getActiveProducts } from "@/lib/products";

// Statically generated and refreshed at most every 5 minutes (admin saves will
// also refresh it on demand). Filtering happens in the browser from the URL, so
// every filter combination is served from this one cached page.
export const revalidate = 300;

export const metadata: Metadata = {
  title: "Shop all jerseys",
  description:
    "Club, Super Eagles and vintage football jerseys for men, women and kids. Add your name, number and badges.",
};

export default async function CataloguePage() {
  const products = await getActiveProducts();
  const options = getFilterOptions(products);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:py-10">
      <Suspense fallback={<CatalogueView products={products} options={options} filters={EMPTY_FILTERS} />}>
        <CatalogueFromUrl products={products} options={options} />
      </Suspense>
    </div>
  );
}
