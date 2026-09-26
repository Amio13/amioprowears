import "server-only";
import type { createAdminClient } from "@/lib/supabase/admin";

/**
 * Append a line to orders.attention_note (why the owner should look at this order).
 * Skips notes already there, so verify + webhook racing don't write it twice.
 */
export async function addAttentionNote(db: ReturnType<typeof createAdminClient>, orderId: string, note: string): Promise<void> {
  const { data, error } = await db.from("orders").select("attention_note").eq("id", orderId).single<{ attention_note: string | null }>();
  if (error) throw new Error(`Loading attention note: ${error.message}`);
  const current = data?.attention_note ?? "";
  if (current.includes(note)) return;
  const { error: updateError } = await db
    .from("orders")
    .update({ attention_note: current ? `${current}\n${note}` : note })
    .eq("id", orderId);
  if (updateError) throw new Error(`Saving attention note: ${updateError.message}`);
}
