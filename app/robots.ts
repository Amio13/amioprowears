import type { MetadataRoute } from "next";
import { STORE } from "@/lib/store-info";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Private or per-customer pages: nothing useful for search engines.
      disallow: ["/admin", "/api/", "/cart", "/checkout", "/order-confirmation/"],
    },
    sitemap: `${STORE.siteUrl}/sitemap.xml`,
  };
}
