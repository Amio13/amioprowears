"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "../action";

const signInSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Enter your email address.")),
  password: z.string().min(1, "Enter your password.").max(200),
  next: z.string().optional(),
});

/** Email + password login. Only accounts listed in admin_users get in. */
export async function signIn(input: z.input<typeof signInSchema>): Promise<ActionResult> {
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check your details." };
  const { email, password, next } = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return {
      ok: false,
      error: error.code === "invalid_credentials" ? "Wrong email or password." : `Couldn't log in: ${error.message}`,
    };
  }

  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (isAdmin !== true) {
    await supabase.auth.signOut();
    return { ok: false, error: "This account doesn't have admin access." };
  }

  // Only ever redirect inside the admin (never to another site).
  redirect(next && /^\/admin(\/|$)/.test(next) && !next.startsWith("/admin/login") ? next : "/admin");
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
