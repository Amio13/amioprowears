import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/**
 * Who is using the admin, checked on the server for every page and every action.
 * Returns null unless the visitor is logged in AND listed in admin_users.
 *
 * The Supabase client returned here carries the admin's login, so Row Level
 * Security still applies — even if a check were missed, the database refuses
 * non-admins. `cache` makes the check run once per request.
 */
export const getAdmin = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: isAdmin, error } = await supabase.rpc("is_admin");
  if (error || isAdmin !== true) return null;
  return { supabase, user };
});

export type AdminContext = NonNullable<Awaited<ReturnType<typeof getAdmin>>>;

/** For admin pages: the admin, or a redirect to the login page. */
export async function requireAdmin(): Promise<AdminContext> {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}
