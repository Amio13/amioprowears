/**
 * What happens after an order is paid, with the database and senders passed in so it
 * is unit-tested with fakes (lib/notify/index.ts wires it to Supabase, Brevo, Telegram).
 *
 * "Exactly once": the redirect verify and the webhook often arrive together and both
 * call this. The first step CLAIMS the order by setting orders.notified_at in one
 * conditional UPDATE (only where it is still empty), so only one caller ever sends.
 * Each message is then sent independently — if one fails (say Brevo is down) the
 * others still go out, the failure is logged, and the order gets an attention note
 * so the owner knows to follow up. A failure never undoes the payment.
 */
import type { Email } from "./brevo";
import { orderConfirmedEmail, ownerAlertEmail, ownerAlertText, type NotifyOrder, type StoreContext } from "./templates";

export interface ClaimedOrder {
  order: NotifyOrder & { newsletter_opt_in: boolean };
  paymentRef: string | null;
}

export interface NotifyDeps {
  /** Set notified_at if still empty and the order is paid. Null if someone else already claimed it. */
  claimOrder(orderId: string): Promise<ClaimedOrder | null>;
  sendEmail(email: Email): Promise<void>;
  sendTelegram(text: string): Promise<void>;
  subscribe(email: string, firstName: string | undefined, source: "checkout"): Promise<void>;
  addAttentionNote(orderId: string, note: string): Promise<void>;
  ctx: StoreContext;
  ownerEmail?: string;
}

export type NotifyResult = { claimed: false } | { claimed: true; failed: string[] };

export async function runOrderPaidNotifications(orderId: string, deps: NotifyDeps): Promise<NotifyResult> {
  const claimed = await deps.claimOrder(orderId);
  if (!claimed) return { claimed: false };
  const { order, paymentRef } = claimed;

  const tasks: [string, () => Promise<void>][] = [
    [
      "customer email",
      () => deps.sendEmail({ to: { email: order.email, name: order.customer_name }, ...orderConfirmedEmail(order, deps.ctx) }),
    ],
    ["Telegram alert", () => deps.sendTelegram(ownerAlertText(order, deps.ctx, paymentRef))],
  ];
  if (deps.ownerEmail) {
    const to = { email: deps.ownerEmail };
    tasks.push(["owner email", () => deps.sendEmail({ to, ...ownerAlertEmail(order, deps.ctx, paymentRef) })]);
  }
  if (order.newsletter_opt_in) {
    const first = order.customer_name.trim().split(/\s+/)[0];
    tasks.push(["newsletter sign-up", () => deps.subscribe(order.email, first, "checkout")]);
  }

  const results = await Promise.allSettled(tasks.map(([, run]) => run()));
  const failed: string[] = [];
  results.forEach((r, i) => {
    if (r.status === "rejected") {
      failed.push(tasks[i][0]);
      console.error(`Order ${order.order_number}: ${tasks[i][0]} failed`, r.reason);
    }
  });

  if (failed.length > 0) {
    await deps
      .addAttentionNote(order.id, `Couldn't send: ${failed.join(", ")}. Contact the customer or resend from admin.`)
      .catch((err) => console.error(`Saving notification note for ${order.order_number} failed`, err));
  }
  return { claimed: true, failed };
}
