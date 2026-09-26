import "server-only";
import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { fieldErrors } from "@/lib/validation";
import { getAdmin, type AdminContext } from "./auth";

/** What every admin server action returns to its form. */
export type ActionResult<T = undefined> =
  | { ok: true; message?: string; data?: T }
  | { ok: false; error: string; fields?: Record<string, string> };

/**
 * Run an admin action: check the admin (server actions can be called directly, not
 * just from our forms), validate the input with zod, and turn thrown errors into a
 * message the form can show.
 */
export async function adminAction<S extends z.ZodType, T = undefined>(
  schema: S,
  input: unknown,
  run: (data: z.output<S>, admin: AdminContext) => Promise<ActionResult<T>>,
): Promise<ActionResult<T>> {
  const admin = await getAdmin();
  if (!admin) return { ok: false, error: "Your login has expired. Refresh the page and log in again." };

  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    const fields = fieldErrors(parsed.error);
    return { ok: false, error: Object.values(fields)[0] ?? "Please check the form.", fields };
  }
  try {
    return await run(parsed.data, admin);
  } catch (err) {
    console.error("Admin action failed", err);
    return { ok: false, error: err instanceof Error ? err.message : "Something went wrong. Please try again." };
  }
}

/** Turn a Supabase/Postgres error into a sentence for the owner. */
export function dbError(error: { code?: string; message: string }, what: string): Error {
  if (error.code === "23505") return new Error(`${what}: that already exists (it must be unique).`);
  if (error.code === "23503") return new Error(`${what}: it's still used by existing orders.`);
  if (error.code === "42501") return new Error(`${what}: permission denied. Are you logged in as an admin?`);
  return new Error(`${what} failed: ${error.message}`);
}

/**
 * Store pages are statically generated and cached. After the admin changes
 * products, badges or settings, drop every cached store page so the change shows
 * on the next visit (pages rebuild one by one as customers open them).
 */
export function revalidateStore(): void {
  revalidatePath("/", "layout");
}
