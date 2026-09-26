import "server-only";
import { subscribe } from "@/lib/newsletter";
import { addAttentionNote } from "@/lib/order-notes";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "./brevo";
import { runOrderPaidNotifications, type ClaimedOrder } from "./run";
import { sendTelegram } from "./telegram";
import { orderStatusEmail, type CustomerStatus, type NotifyOrder, type StoreContext } from "./templates";

const ORDER_FIELDS =
  "id, order_number, customer_name, phone, alt_phone, email, state, city, motor_park, delivery_zone, " +
  "delivery_fee, subtotal, discount, total, voucher_code, notes, logistics_name, logistics_phone, dispatch_note, newsletter_opt_in";
const ITEM_FIELDS = "product_name, size, custom_name, custom_number, badge_name, quantity, item_total";

function storeContext(): StoreContext {
  return {
    storeName: process.env.NEXT_PUBLIC_STORE_NAME || "Amioprowears",
    siteUrl: (process.env.NEXT_PUBLIC_SITE_URL || "https://amioprowears.com").replace(/\/+$/, ""),
    supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || undefined,
    supportPhone: process.env.NEXT_PUBLIC_SUPPORT_PHONE || undefined,
    whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP_CHAT_NUMBER || undefined,
  };
}

type OrderRow = Omit<NotifyOrder, "items"> & { newsletter_opt_in: boolean };

async function loadItems(db: ReturnType<typeof createAdminClient>, orderId: string): Promise<NotifyOrder["items"]> {
  const { data, error } = await db.from("order_items").select(ITEM_FIELDS).eq("order_id", orderId).returns<NotifyOrder["items"]>();
  if (error) throw new Error(`Loading order items: ${error.message}`);
  return data ?? [];
}

/**
 * Runs after an order is paid (called by markPaymentSuccessful): customer email,
 * owner Telegram + email alert, newsletter opt-in. Sent at most once — see run.ts.
 */
export async function notifyOrderPaid(orderId: string): Promise<void> {
  const db = createAdminClient();
  await runOrderPaidNotifications(orderId, {
    async claimOrder(id): Promise<ClaimedOrder | null> {
      const { data, error } = await db
        .from("orders")
        .update({ notified_at: new Date().toISOString() })
        .eq("id", id)
        .eq("payment_status", "paid")
        .is("notified_at", null)
        .select(ORDER_FIELDS)
        .returns<OrderRow[]>();
      if (error) throw new Error(`Claiming order for notifications: ${error.message}`);
      const row = data?.[0];
      if (!row) return null;

      const [items, payment] = await Promise.all([
        loadItems(db, id),
        db.from("payments").select("reference").eq("order_id", id).eq("status", "success").limit(1).maybeSingle<{ reference: string }>(),
      ]);
      return { order: { ...row, items }, paymentRef: payment.data?.reference ?? null };
    },
    sendEmail,
    sendTelegram,
    subscribe,
    addAttentionNote: (id, note) => addAttentionNote(db, id, note),
    ctx: storeContext(),
    ownerEmail: process.env.OWNER_EMAIL || undefined,
  });
}

/**
 * Email the customer when the admin marks an order dispatched or delivered (Phase 6
 * calls this after saving the status). Throws on failure so the admin sees it.
 */
export async function sendOrderStatusEmail(orderId: string, status: CustomerStatus): Promise<void> {
  const db = createAdminClient();
  const { data, error } = await db.from("orders").select(ORDER_FIELDS).eq("id", orderId).maybeSingle<OrderRow>();
  if (error) throw new Error(`Loading order: ${error.message}`);
  if (!data) throw new Error("Order not found");
  const order: NotifyOrder = { ...data, items: await loadItems(db, orderId) };
  await sendEmail({ to: { email: order.email, name: order.customer_name }, ...orderStatusEmail(order, status, storeContext()) });
}
