import "server-only";

/**
 * Runs after an order is paid. Phase 5 fills this in: customer email (Brevo),
 * owner alert (Telegram + email), newsletter opt-in — sent at most once by
 * claiming orders.notified_at first. Until then it does nothing.
 */
export async function notifyOrderPaid(orderId: string): Promise<void> {
  void orderId;
}
