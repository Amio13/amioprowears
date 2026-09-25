import "server-only";
import { cache } from "react";
import { CATALOGUE_PRODUCT_COLUMNS, type CatalogueProduct } from "./catalogue";
import { createPublicClient } from "./supabase/public";
import type { Product } from "@/types";

/**
 * Public product reads for statically generated store pages. Errors are thrown
 * (not swallowed) so a failed build or background revalidation keeps serving the
 * last good page instead of caching an empty store.
 */

/** Every active product, with just the fields the grid needs. */
export const getActiveProducts = cache(async (): Promise<CatalogueProduct[]> => {
  const { data, error } = await createPublicClient()
    .from("products")
    .select(CATALOGUE_PRODUCT_COLUMNS)
    .eq("is_active", true)
    .order("sort_order")
    .returns<CatalogueProduct[]>();
  if (error) throw new Error(`Loading products failed: ${error.message}`);
  return data;
});

/** One active product by slug, or null if it doesn't exist / is hidden. */
export const getProductBySlug = cache(async (slug: string): Promise<Product | null> => {
  const { data, error } = await createPublicClient()
    .from("products")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle<Product>();
  if (error) throw new Error(`Loading product "${slug}" failed: ${error.message}`);
  return data;
});
