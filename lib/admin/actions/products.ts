"use server";

import { z } from "zod";
import { adminAction, dbError, revalidateStore, type ActionResult } from "../action";
import { planBulkChange } from "../bulk-price";
import { bulkPriceSchema, productInputSchema, type BulkPriceInput, type ProductInput } from "../schemas";

/** Create or update a jersey and its allowed badges. */
export async function saveProduct(input: ProductInput): Promise<ActionResult<{ id: string }>> {
  return adminAction(productInputSchema, input, async ({ id, badge_ids, ...row }, { supabase }) => {
    const saved = id
      ? await supabase.from("products").update(row).eq("id", id).select("id").maybeSingle<{ id: string }>()
      : await supabase.from("products").insert(row).select("id").single<{ id: string }>();
    if (saved.error) {
      if (saved.error.code === "23505") {
        return { ok: false, error: "Another jersey already uses this web address.", fields: { slug: "Choose a different web address." } };
      }
      throw dbError(saved.error, "Saving the jersey");
    }
    if (!saved.data) throw new Error("Jersey not found — it may have been deleted.");
    const productId = saved.data.id;

    // Replace the allowed badges: remove all, add the chosen ones.
    const removed = await supabase.from("product_badges").delete().eq("product_id", productId);
    if (removed.error) throw dbError(removed.error, "Saving badges");
    if (badge_ids.length) {
      const added = await supabase.from("product_badges").insert(badge_ids.map((badge_id) => ({ product_id: productId, badge_id })));
      if (added.error) throw dbError(added.error, "Saving badges");
    }

    revalidateStore();
    return { ok: true, message: id ? "Saved. The store updates within a minute." : "Jersey added.", data: { id: productId } };
  });
}

/** Delete a jersey that has never been ordered. Ordered jerseys can only be hidden. */
export async function deleteProduct(input: { id: string }): Promise<ActionResult> {
  return adminAction(z.object({ id: z.uuid() }), input, async ({ id }, { supabase }) => {
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error?.code === "23503") {
      return { ok: false, error: "This jersey is in past orders, so it can't be deleted. Untick \"Show in store\" to hide it instead." };
    }
    if (error) throw dbError(error, "Deleting the jersey");
    revalidateStore();
    return { ok: true, message: "Deleted." };
  });
}

/**
 * Bulk price change. New prices are worked out here from the prices in the DB (not
 * from the browser), then saved in one request via admin_set_product_prices().
 */
export async function bulkUpdatePrices(input: BulkPriceInput): Promise<ActionResult<{ count: number }>> {
  return adminAction(bulkPriceSchema, input, async ({ productIds, op, alsoSale }, { supabase }) => {
    // All prices (a small table) rather than a long `in (...)` list in the URL.
    const { data, error } = await supabase
      .from("products")
      .select("id, price, sale_price")
      .returns<{ id: string; price: number; sale_price: number | null }[]>();
    if (error) throw dbError(error, "Loading products");

    const chosen = new Set(productIds);
    const updates = data.filter((p) => chosen.has(p.id)).map((p) => planBulkChange(p, op, alsoSale));
    const { data: count, error: rpcError } = await supabase.rpc("admin_set_product_prices", { p_updates: updates });
    if (rpcError) {
      if (rpcError.code === "PGRST202") throw new Error("Database update 0006_admin.sql hasn't been applied yet.");
      throw dbError(rpcError, "Updating prices");
    }

    revalidateStore();
    return { ok: true, message: `Updated ${count} price${count === 1 ? "" : "s"}.`, data: { count: count as number } };
  });
}
