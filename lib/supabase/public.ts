import { createClient } from "@supabase/supabase-js";

/**
 * Anon Supabase client WITHOUT cookies, for public store data (products, badges,
 * settings). Because it never reads cookies, pages that use it can be statically
 * generated and cached (ISR). RLS still applies: only active rows are visible.
 */
export function createPublicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
        "Set them in .env.local / .dev.vars, and as build variables in Cloudflare Workers Builds.",
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
