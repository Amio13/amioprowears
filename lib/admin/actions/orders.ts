"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { sendOrderStatusEmail } from "@/lib/notify";
import { CUSTOMER_STATUSES, type CustomerStatus } from "@/lib/notify/templates";
import { adminAction, dbError, type ActionResult } from "../action";
import { orderUpdateSchema, type OrderUpdateInput } from "../schemas";

const isCustomerStatus = (s: string): s is CustomerStatus => (CUSTOMER_STATUSES as readonly string[]).includes(s);

/** Save status + logistics details; optionally email the customer about the new status. */
export async function updateOrder(input: OrderUpdateInput): Promise<ActionResult> {
  return adminAction(orderUpdateSchema, input, async ({ orderId, emailCustomer, ...fields }, { supabase }) => {
    const { data, error } = await supabase.from("orders").update(fields).eq("id", orderId).select("id").maybeSingle();
    if (error) throw dbError(error, "Saving the order");
    if (!data) throw new Error("Order not found.");
    revalidatePath("/admin", "layout");

    if (!emailCustomer || !isCustomerStatus(fields.status)) return { ok: true, message: "Saved." };
    try {
      await sendOrderStatusEmail(orderId, fields.status);
      return { ok: true, message: "Saved and emailed the customer." };
    } catch (err) {
      console.error("Order status email failed", err);
      return { ok: false, error: "Saved, but the email to the customer failed. Try saving again with the email box ticked." };
    }
  });
}

const orderIdSchema = z.object({ orderId: z.uuid() });

/** After refunding in the Paystack dashboard: record it so analytics stop counting the sale. */
export async function markOrderRefunded(input: { orderId: string }): Promise<ActionResult> {
  return adminAction(orderIdSchema, input, async ({ orderId }, { supabase }) => {
    const { data, error } = await supabase
      .from("orders")
      .update({ payment_status: "refunded" })
      .eq("id", orderId)
      .in("payment_status", ["paid", "amount_mismatch"])
      .select("id")
      .maybeSingle();
    if (error) throw dbError(error, "Marking the order refunded");
    if (!data) throw new Error("Only paid orders can be marked refunded.");
    revalidatePath("/admin", "layout");
    return { ok: true, message: "Marked as refunded." };
  });
}

/** The owner has dealt with whatever the attention note flagged. */
export async function clearAttentionNote(input: { orderId: string }): Promise<ActionResult> {
  return adminAction(orderIdSchema, input, async ({ orderId }, { supabase }) => {
    const { error } = await supabase.from("orders").update({ attention_note: null }).eq("id", orderId);
    if (error) throw dbError(error, "Clearing the note");
    revalidatePath("/admin", "layout");
    return { ok: true };
  });
}
