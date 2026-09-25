/**
 * The ONE place a payment becomes a paid order (CLAUDE.md rule 3). Called by both
 * the redirect verify (/order-confirmation, /api/payments/verify) and the webhook,
 * often at the same moment, so every step is safe to repeat:
 *
 *   1. Never trust the caller — always re-verify the reference with the provider.
 *   2. The amount paid must equal what we expected, else flag it and stop.
 *   3. The order flips unpaid → paid with a conditional update, so only one caller wins.
 *   4. The voucher is redeemed by redeem_voucher() (row lock, idempotent per order).
 *      If it ran out meanwhile, the paid order is honoured and flagged for the owner.
 *   5. Notifications run after that; they must send at most once (notified_at,
 *      Phase 5) and a failure never undoes the payment.
 *
 * The DB and provider are passed in (ConfirmDeps) so this is unit-tested with fakes;
 * lib/payments/confirm-db.ts wires it to Supabase.
 */
import type { PaymentProvider, ProviderId } from "./types";
import type { PaymentRecordStatus, PaymentStatus } from "@/types";

export interface ConfirmPayment {
  id: string;
  order_id: string;
  provider: ProviderId;
  amount: number;
  status: PaymentRecordStatus;
}

export interface ConfirmOrder {
  id: string;
  order_number: string;
  total: number;
  payment_status: PaymentStatus;
  voucher_id: string | null;
  voucher_code: string | null;
}

export interface ConfirmDeps {
  getPayment(reference: string): Promise<ConfirmPayment | null>;
  getOrder(orderId: string): Promise<ConfirmOrder | null>;
  updatePayment(
    paymentId: string,
    patch: {
      status: PaymentRecordStatus;
      amount_paid?: number;
      provider_fee?: number;
      confirmed_at?: string;
      raw?: unknown;
    },
  ): Promise<void>;
  /** unpaid/failed → paid in one conditional UPDATE. Returns true only for the caller that flipped it. */
  markOrderPaid(orderId: string, paidAt: string): Promise<boolean>;
  /** Set payment_status, but only if it is currently one of `from`. */
  setOrderPaymentStatus(orderId: string, status: PaymentStatus, from: PaymentStatus[]): Promise<void>;
  addAttentionNote(orderId: string, note: string): Promise<void>;
  redeemVoucher(voucherId: string, orderId: string): Promise<boolean>;
  /** Notifications etc. Must be idempotent itself (Phase 5 uses notified_at). */
  afterPaid(orderId: string): Promise<void>;
  getProvider(id: ProviderId): PaymentProvider;
  now(): Date;
}

export type ConfirmResult =
  | { status: "paid"; orderId: string; firstConfirmation: boolean }
  | { status: "pending" | "failed" | "amount_mismatch"; orderId: string }
  | { status: "not_found" };

export async function confirmPayment(reference: string, deps: ConfirmDeps): Promise<ConfirmResult> {
  const payment = await deps.getPayment(reference);
  if (!payment) return { status: "not_found" };
  const order = await deps.getOrder(payment.order_id);
  if (!order) return { status: "not_found" };

  // Already done (e.g. the webhook beat the redirect): make sure the follow-ups ran, and stop.
  if (order.payment_status === "paid" && payment.status === "success") {
    await runAfterPaid(deps, order.id);
    return { status: "paid", orderId: order.id, firstConfirmation: false };
  }
  if (order.payment_status === "amount_mismatch" || payment.status === "amount_mismatch") {
    return { status: "amount_mismatch", orderId: order.id };
  }

  let verified;
  try {
    verified = await deps.getProvider(payment.provider).verify(reference);
  } catch (err) {
    console.error(`Verifying payment ${reference} failed`, err);
    return { status: "pending", orderId: order.id }; // try again later; the webhook will retry too
  }

  if (verified.status === "pending") {
    if (payment.status !== "success") await deps.updatePayment(payment.id, { status: "pending", raw: verified.raw });
    return { status: "pending", orderId: order.id };
  }

  if (verified.status === "failed") {
    if (payment.status !== "success") await deps.updatePayment(payment.id, { status: "failed", raw: verified.raw });
    await deps.setOrderPaymentStatus(order.id, "failed", ["unpaid"]);
    return { status: "failed", orderId: order.id };
  }

  // Success from the provider — but did they pay the right amount?
  if (verified.amountNaira !== payment.amount || payment.amount !== order.total) {
    await deps.updatePayment(payment.id, {
      status: "amount_mismatch",
      amount_paid: Number.isFinite(verified.amountNaira) ? Math.round(verified.amountNaira) : undefined,
      raw: verified.raw,
    });
    await deps.setOrderPaymentStatus(order.id, "amount_mismatch", ["unpaid", "failed"]);
    await deps.addAttentionNote(
      order.id,
      `Amount mismatch: Paystack reports ₦${verified.amountNaira} paid, order total is ₦${order.total}. ` +
        `Check the payment (ref ${reference}) before sending anything.`,
    );
    console.error(`AMOUNT MISMATCH on ${order.order_number} (ref ${reference})`);
    return { status: "amount_mismatch", orderId: order.id };
  }

  const nowIso = deps.now().toISOString();
  await deps.updatePayment(payment.id, {
    status: "success",
    amount_paid: verified.amountNaira,
    provider_fee: verified.providerFee,
    confirmed_at: nowIso,
    raw: verified.raw,
  });
  const firstConfirmation = await deps.markOrderPaid(order.id, nowIso);

  if (order.voucher_id) {
    const redeemed = await deps.redeemVoucher(order.voucher_id, order.id);
    if (!redeemed) {
      await deps.addAttentionNote(
        order.id,
        `Voucher ${order.voucher_code ?? ""} was used up or expired before payment went through. ` +
          `The discount was honoured.`,
      );
    }
  }

  await runAfterPaid(deps, order.id);
  return { status: "paid", orderId: order.id, firstConfirmation };
}

async function runAfterPaid(deps: ConfirmDeps, orderId: string) {
  try {
    await deps.afterPaid(orderId);
  } catch (err) {
    // Notification problems are logged and never block payment confirmation.
    console.error(`After-payment steps failed for order ${orderId}`, err);
  }
}
