"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Keeps the admin logged in. Server pages can read the login cookie but can't save
 * a refreshed one (and we don't use middleware), so the browser client does it: it
 * refreshes the session before it expires and writes the new cookie. If the login
 * ends (signed out in another tab, or expired), go to the login page.
 */
export function SessionKeeper() {
  const router = useRouter();
  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getSession();
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") router.replace("/admin/login");
    });
    return () => data.subscription.unsubscribe();
  }, [router]);
  return null;
}
