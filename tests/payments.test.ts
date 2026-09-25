import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { confirmPayment, type ConfirmDeps, type ConfirmOrder, type ConfirmPayment } from "@/lib/payments/confirm";
import {
  fromKobo,
  isValidPaystackSignature,
  mapPaystackStatus,
  paystackProvider,
  toKobo,
} from "@/lib/payments/providers/paystack";
import type { VerifyResult } from "@/lib/payments/types";

// ---------------------------------------------------------------------------
// A tiny in-memory "database" implementing ConfirmDeps
// ---------------------------------------------------------------------------
function setup(opts: { verify?: VerifyResult | (() => Promise<VerifyResult>); voucherLeft?: number; withVoucher?: boolean } = {}) {
  const payment: ConfirmPayment = { id: "pay1", order_id: "ord1", provider: "paystack", amount: 18450, status: "initialized" };
  const order: ConfirmOrder & { paid_at: string | null; attention_note: string } = {
    id: "ord1",
    order_number: "APW-1047",
    total: 18450,
    payment_status: "unpaid",
    voucher_id: opts.withVoucher ? "v1" : null,
    voucher_code: opts.withVoucher ? "APW-7KQ2" : null,
    paid_at: null,
    attention_note: "",
  };
  const voucher = { left: opts.voucherLeft ?? 1, redeemedBy: new Set<string>() };
  const afterPaid = vi.fn(async () => {});
  const fixed = typeof opts.verify === "function" ? null : opts.verify;
  const verify = vi.fn<(reference: string) => Promise<VerifyResult>>(
    typeof opts.verify === "function"
      ? opts.verify
      : async () => fixed ?? { status: "success", amountNaira: 18450, providerFee: 377, raw: {} },
  );

  const deps: ConfirmDeps = {
    getPayment: async (ref) => (ref === "APW-1047-abc" ? { ...payment } : null),
    getOrder: async (id) => (id === order.id ? { ...order } : null),
    updatePayment: async (_id, patch) => {
      Object.assign(payment, patch);
    },
    markOrderPaid: async (_id, paidAt) => {
      if (order.payment_status !== "unpaid" && order.payment_status !== "failed") return false;
      order.payment_status = "paid";
      order.paid_at = paidAt;
      return true;
    },
    setOrderPaymentStatus: async (_id, status, from) => {
      if (from.includes(order.payment_status)) order.payment_status = status;
    },
    addAttentionNote: async (_id, note) => {
      if (!order.attention_note.includes(note)) order.attention_note += note;
    },
    redeemVoucher: async (_v, orderId) => {
      if (voucher.redeemedBy.has(orderId)) return true;
      if (voucher.left <= 0) return false;
      voucher.left--;
      voucher.redeemedBy.add(orderId);
      return true;
    },
    afterPaid,
    getProvider: () => ({ ...paystackProvider, verify }),
    now: () => new Date("2026-09-25T12:00:00Z"),
  };
  return { deps, payment, order, voucher, afterPaid, verify };
}

describe("confirmPayment (markPaymentSuccessful)", () => {
  it("success: order paid, payment recorded, follow-ups run", async () => {
    const t = setup();
    const r = await confirmPayment("APW-1047-abc", t.deps);
    expect(r).toEqual({ status: "paid", orderId: "ord1", firstConfirmation: true });
    expect(t.order.payment_status).toBe("paid");
    expect(t.order.paid_at).toBe("2026-09-25T12:00:00.000Z");
    expect(t.payment).toMatchObject({ status: "success", amount_paid: 18450, provider_fee: 377 });
    expect(t.afterPaid).toHaveBeenCalledTimes(1);
  });

  it("is idempotent: a second call (verify after webhook) changes nothing and doesn't re-verify", async () => {
    const t = setup();
    await confirmPayment("APW-1047-abc", t.deps);
    const again = await confirmPayment("APW-1047-abc", t.deps);
    expect(again).toEqual({ status: "paid", orderId: "ord1", firstConfirmation: false });
    expect(t.verify).toHaveBeenCalledTimes(1);
  });

  it("verify and webhook at the same moment: only one flips the order, voucher counted once", async () => {
    const t = setup({ withVoucher: true, voucherLeft: 5 });
    const [a, b] = await Promise.all([confirmPayment("APW-1047-abc", t.deps), confirmPayment("APW-1047-abc", t.deps)]);
    const firsts = [a, b].filter((r) => r.status === "paid" && r.firstConfirmation);
    expect(firsts).toHaveLength(1);
    expect(t.voucher.left).toBe(4);
  });

  it("amount mismatch: not confirmed, flagged for the owner", async () => {
    const t = setup({ verify: { status: "success", amountNaira: 100, raw: {} } });
    const r = await confirmPayment("APW-1047-abc", t.deps);
    expect(r.status).toBe("amount_mismatch");
    expect(t.order.payment_status).toBe("amount_mismatch");
    expect(t.payment.status).toBe("amount_mismatch");
    expect(t.order.attention_note).toContain("Amount mismatch");
    expect(t.afterPaid).not.toHaveBeenCalled();
    // …and stays that way on retry
    expect((await confirmPayment("APW-1047-abc", t.deps)).status).toBe("amount_mismatch");
  });

  it("non-naira payment counts as a mismatch", async () => {
    const t = setup({ verify: { status: "success", amountNaira: Number.NaN, raw: {} } });
    expect((await confirmPayment("APW-1047-abc", t.deps)).status).toBe("amount_mismatch");
  });

  it("failed payment: order marked failed; a later success still confirms it", async () => {
    const t = setup({ verify: { status: "failed", amountNaira: 0, raw: {} } });
    expect((await confirmPayment("APW-1047-abc", t.deps)).status).toBe("failed");
    expect(t.order.payment_status).toBe("failed");
    t.verify.mockResolvedValue({ status: "success", amountNaira: 18450, raw: {} });
    expect((await confirmPayment("APW-1047-abc", t.deps)).status).toBe("paid");
    expect(t.order.payment_status).toBe("paid");
  });

  it("pending, or provider unreachable → pending, nothing marked", async () => {
    const t = setup({ verify: { status: "pending", amountNaira: 0, raw: {} } });
    expect((await confirmPayment("APW-1047-abc", t.deps)).status).toBe("pending");
    expect(t.order.payment_status).toBe("unpaid");
    const down = setup({ verify: () => Promise.reject(new Error("timeout")) });
    expect((await confirmPayment("APW-1047-abc", down.deps)).status).toBe("pending");
  });

  it("single-use voucher already used by someone else: order honoured and flagged", async () => {
    const t = setup({ withVoucher: true, voucherLeft: 0 });
    expect((await confirmPayment("APW-1047-abc", t.deps)).status).toBe("paid");
    expect(t.order.attention_note).toContain("APW-7KQ2");
  });

  it("notification failure never undoes the payment", async () => {
    const t = setup();
    t.afterPaid.mockRejectedValueOnce(new Error("Brevo down"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await confirmPayment("APW-1047-abc", t.deps)).status).toBe("paid");
    expect(t.order.payment_status).toBe("paid");
    spy.mockRestore();
  });

  it("unknown reference", async () => {
    expect(await confirmPayment("nope", setup().deps)).toEqual({ status: "not_found" });
  });
});

describe("Paystack helpers", () => {
  it("naira ↔ kobo only at the boundary", () => {
    expect(toKobo(18450)).toBe(1845000);
    expect(fromKobo(1845000)).toBe(18450);
  });

  it("status mapping", () => {
    expect(mapPaystackStatus("success")).toBe("success");
    expect(mapPaystackStatus("abandoned")).toBe("failed");
    expect(mapPaystackStatus("failed")).toBe("failed");
    expect(mapPaystackStatus("ongoing")).toBe("pending");
  });

  it("webhook signature: HMAC SHA-512 of the raw body (matches Node's crypto)", async () => {
    const secret = "sk_test_abc";
    const body = JSON.stringify({ event: "charge.success", data: { reference: "APW-1047-abc" } });
    const good = createHmac("sha512", secret).update(body).digest("hex");
    expect(await isValidPaystackSignature(body, good, secret)).toBe(true);
    expect(await isValidPaystackSignature(body, good.toUpperCase(), secret)).toBe(true);
    expect(await isValidPaystackSignature(body + " ", good, secret)).toBe(false);
    expect(await isValidPaystackSignature(body, createHmac("sha512", "wrong").update(body).digest("hex"), secret)).toBe(false);
    expect(await isValidPaystackSignature(body, null, secret)).toBe(false);
  });

  it("parseWebhook: only signed charge.success events", async () => {
    process.env.PAYSTACK_SECRET_KEY = "sk_test_abc";
    const req = (payload: object, sign = true) => {
      const body = JSON.stringify(payload);
      const sig = sign ? createHmac("sha512", "sk_test_abc").update(body).digest("hex") : "bad";
      return new Request("https://x/webhook", { method: "POST", body, headers: { "x-paystack-signature": sig } });
    };
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(await paystackProvider.parseWebhook(req({ event: "charge.success", data: { reference: "R1" } }))).toEqual({ reference: "R1" });
    expect(await paystackProvider.parseWebhook(req({ event: "transfer.success", data: { reference: "R1" } }))).toBeNull();
    expect(await paystackProvider.parseWebhook(req({ event: "charge.success", data: { reference: "R1" } }, false))).toBeNull();
    warn.mockRestore();
  });
});
