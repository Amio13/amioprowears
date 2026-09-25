import "server-only";
import { notifyOrderPaid } from "@/lib/notify";
import { createAdminClient } from "@/lib/supabase/admin";
import { confirmPayment, type ConfirmDeps, type ConfirmOrder, type ConfirmPayment, type ConfirmResult } from "./confirm";
import { getProvider } from "./index";

/** Supabase implementation of ConfirmDeps (service role — server only). */
function supabaseDeps(): ConfirmDeps {
  const db = createAdminClient();
  const must = (error: { message: string } | null, what: string) => {
    if (error) throw new Error(`${what}: ${error.message}`);
  };

  return {
    async getPayment(reference) {
      const { data, error } = await db
        .from("payments")
        .select("id, order_id, provider, amount, status")
        .eq("reference", reference)
        .maybeSingle<ConfirmPayment>();
      must(error, "Loading payment");
      return data;
    },
    async getOrder(orderId) {
      const { data, error } = await db
        .from("orders")
        .select("id, order_number, total, payment_status, voucher_id, voucher_code")
        .eq("id", orderId)
        .maybeSingle<ConfirmOrder>();
      must(error, "Loading order");
      return data;
    },
    async updatePayment(paymentId, patch) {
      const { error } = await db.from("payments").update(patch).eq("id", paymentId);
      must(error, "Updating payment");
    },
    async markOrderPaid(orderId, paidAt) {
      const { data, error } = await db
        .from("orders")
        .update({ payment_status: "paid", paid_at: paidAt })
        .eq("id", orderId)
        .in("payment_status", ["unpaid", "failed"])
        .select("id");
      must(error, "Marking order paid");
      return (data?.length ?? 0) > 0;
    },
    async setOrderPaymentStatus(orderId, status, from) {
      const { error } = await db.from("orders").update({ payment_status: status }).eq("id", orderId).in("payment_status", from);
      must(error, "Updating order payment status");
    },
    async addAttentionNote(orderId, note) {
      const { data, error } = await db.from("orders").select("attention_note").eq("id", orderId).single<{ attention_note: string | null }>();
      must(error, "Loading attention note");
      const current = data?.attention_note ?? "";
      if (current.includes(note)) return; // verify + webhook racing: don't write it twice
      const { error: updateError } = await db
        .from("orders")
        .update({ attention_note: current ? `${current}\n${note}` : note })
        .eq("id", orderId);
      must(updateError, "Saving attention note");
    },
    async redeemVoucher(voucherId, orderId) {
      const { data, error } = await db.rpc("redeem_voucher", { p_voucher_id: voucherId, p_order_id: orderId });
      must(error, "Redeeming voucher");
      return data === true;
    },
    afterPaid: notifyOrderPaid,
    getProvider,
    now: () => new Date(),
  };
}

/** CLAUDE.md rule 3: the one idempotent confirmation, used by verify AND the webhook. */
export function markPaymentSuccessful(reference: string): Promise<ConfirmResult> {
  return confirmPayment(reference, supabaseDeps());
}
