import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Images are served straight from Supabase Storage (compressed to WebP on upload).
    // Cloudflare image optimisation isn't free at volume, so it stays off.
    unoptimized: true,
  },
};

export default nextConfig;

// Lets `next dev` read Cloudflare bindings (env, etc.) the same way the Worker does.
import("@opennextjs/cloudflare").then((m) => m.initOpenNextCloudflareForDev());
