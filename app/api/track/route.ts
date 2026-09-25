import { json, readJson, serverError } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";
import { trackSchema } from "@/lib/validation";

/**
 * Order lookup by order number + phone. Returns status and items ONLY — no name,
 * address, email or totals (CLAUDE.md rule 7). Same message for "no such order"
 * and "wrong phone", so it can't be used to probe order numbers.
 */
export async function POST(req: Request) {
  const parsed = await readJson(req, trackSchema);
  if ("response" in parsed) return parsed.response;
  const { orderNumber, phone } = parsed.data;

  try {
    const { data, error } = await createAdminClient()
      .from("orders")
      .select(
        "order_number, status, payment_status, created_at, " +
          "order_items(product_name, size, custom_name, custom_number, badge_name, quantity)",
      )
      .eq("order_number", orderNumber)
      .eq("phone", phone)
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      return json({ error: "We couldn't find an order with that number and phone. Check both and try again." }, 404);
    }
    return json(data);
  } catch (err) {
    return serverError(err, "Order tracking");
  }
}
