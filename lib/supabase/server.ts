import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Supabase client for Server Components, Route Handlers and Server Actions.
 * Uses the anon key + the visitor's auth cookie, so RLS applies (admin pages see
 * admin data only when the logged-in user is in admin_users).
 *
 * Reading cookies makes a page dynamic, so public catalogue pages that should be
 * statically generated should not use this client.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component, where cookies are read-only. Safe to
            // ignore: the session is refreshed on the next Route Handler/Action.
          }
        },
      },
    },
  );
}
