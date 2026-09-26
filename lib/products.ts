import "server-only";
import { cache } from "react";
import { CATALOGUE_PRODUCT_COLUMNS, type CatalogueProduct } from "./catalogue";
import { resolveDeliveryFees, type DeliveryFees } from "./delivery-zones";
import { resolveHomepage, type HomepageConfig } from "./homepage";
import { createPublicClient } from "./supabase/public";
import type { Badge, Product, Settings } from "@/types";

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

/** Active badges the customer may add to this product, cheapest first. */
export const getProductBadges = cache(async (productId: string): Promise<Badge[]> => {
  const { data, error } = await createPublicClient()
    .from("product_badges")
    .select("badges(id, name, image_url, price, position, is_active, created_at)")
    .eq("product_id", productId)
    .returns<{ badges: Badge | null }[]>();
  if (error) throw new Error(`Loading badges failed: ${error.message}`);
  return data
    .map((row) => row.badges)
    .filter((b): b is Badge => b !== null && b.is_active)
    .sort((a, b) => a.price - b.price || a.name.localeCompare(b.name));
});

/** Public store settings (name/number fee, open/closed, announcement). */
export const getStoreSettings = cache(async (): Promise<Pick<Settings, "name_number_fee" | "store_open" | "announcement">> => {
  const { data, error } = await createPublicClient()
    .from("settings")
    .select("name_number_fee, store_open, announcement")
    .eq("id", 1)
    .single<Pick<Settings, "name_number_fee" | "store_open" | "announcement">>();
  if (error) throw new Error(`Loading settings failed: ${error.message}`);
  return data;
});

/** Delivery fee per zone from admin → Settings (defaults if migration 0008 isn't applied). */
export const getDeliveryFees = cache(async (): Promise<DeliveryFees> => {
  const { data, error } = await createPublicClient().from("settings").select("*").eq("id", 1).single<Record<string, unknown>>();
  if (error) throw new Error(`Loading delivery fees failed: ${error.message}`);
  return resolveDeliveryFees(data);
});

/**
 * Homepage content from admin → Homepage. Falls back to the defaults if migration
 * 0007 hasn't been applied yet (column missing), so a deploy never breaks the homepage.
 */
export const getHomepageConfig = cache(async (): Promise<HomepageConfig> => {
  const { data, error } = await createPublicClient()
    .from("settings")
    .select("homepage")
    .eq("id", 1)
    .single<{ homepage: unknown }>();
  if (error?.code === "42703") return resolveHomepage({});
  if (error) throw new Error(`Loading homepage settings failed: ${error.message}`);
  return resolveHomepage(data.homepage);
});
