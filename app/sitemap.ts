import type { MetadataRoute } from "next";
import { getActiveProducts } from "@/lib/products";
import { STORE } from "@/lib/store-info";

// Cached; rebuilt at most once an hour so new jerseys appear without a deploy.
export const revalidate = 3600;

const PAGES = ["", "/catalogue", "/track", "/about", "/contact", "/delivery", "/returns", "/privacy", "/terms"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await getActiveProducts();
  return [
    ...PAGES.map((path) => ({ url: `${STORE.siteUrl}${path}`, changeFrequency: "weekly" as const, priority: path === "" ? 1 : 0.5 })),
    ...products.map((p) => ({ url: `${STORE.siteUrl}/jersey/${p.slug}`, changeFrequency: "weekly" as const, priority: 0.8 })),
  ];
}
