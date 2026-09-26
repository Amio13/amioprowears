import { describe, expect, it, vi } from "vitest";
import { runOrderPaidNotifications, type ClaimedOrder, type NotifyDeps } from "@/lib/notify/run";
import {
  customLine,
  escapeHtml,
  orderConfirmedEmail,
  orderStatusEmail,
  ownerAlertText,
  type NotifyOrder,
  type StoreContext,
} from "@/lib/notify/templates";
import { newsletterSchema } from "@/lib/validation";

const ctx: StoreContext = {
  storeName: "Amioprowears",
  siteUrl: "https://amioprowears.com",
  supportEmail: "support@amioprowears.com",
  supportPhone: "2348031234567",
  whatsappNumber: "2348031234567",
};

const order: NotifyOrder = {
  id: "ord1",
  order_number: "APW-1047",
  customer_name: "Chidi Okafor",
  phone: "2348031234567",
  alt_phone: "2349051234567",
  email: "chidi@example.com",
  state: "Enugu",
  city: "Nsukka",
  motor_park: "Holy Ghost Park",
  delivery_zone: "A",
  delivery_fee: 2050,
  subtotal: 36900,
  discount: 1000,
  total: 37950,
  voucher_code: "APW-7KQ2",
  notes: null,
  logistics_name: "GIG Logistics",
  logistics_phone: "2348091234567",
  dispatch_note: "Waybill 12345",
  items: [
    { product_name: "Arsenal Home 24/25", size: "L", custom_name: "SAKA", custom_number: "7", badge_name: "Premier League", quantity: 1, item_total: 21950 },
    { product_name: "Nigeria Away", size: "M", custom_name: null, custom_number: null, badge_name: null, quantity: 1, item_total: 14950 },
  ],
};

describe("templates", () => {
  it("owner alert matches the SPEC format", () => {
    const text = ownerAlertText(order, ctx, "APW-1047-abc");
    expect(text).toContain("🛒 NEW ORDER #APW-1047");
    expect(text).toContain("Phone: 0803 123 4567  Alt: 0905 123 4567");
    expect(text).toContain("Motor park: Holy Ghost Park, Nsukka, Enugu");
    expect(text).toContain("Arsenal Home 24/25 — L × 1\nCustom: SAKA | #7 | Badge: Premier League");
    expect(text).toContain("Nigeria Away — M × 1\n─");
    expect(text).toContain("Delivery (Zone A): ₦2,050");
    expect(text).toContain("Voucher APW-7KQ2: -₦1,000");
    expect(text).toContain("Total paid: ₦37,950 ✅");
    expect(text).toContain("Paystack ref: APW-1047-abc");
    expect(text).toContain("Admin: https://amioprowears.com/admin/orders/ord1");
  });

  it("leaves out empty extras", () => {
    const text = ownerAlertText({ ...order, alt_phone: null, discount: 0, voucher_code: null }, ctx, null);
    expect(text).not.toContain("Alt:");
    expect(text).not.toContain("Voucher");
    expect(text).not.toContain("Paystack ref");
  });

  it("customLine keeps numbers as typed", () => {
    expect(customLine({ ...order.items[0], custom_number: "07", badge_name: null })).toBe("SAKA | #07");
    expect(customLine(order.items[1])).toBe("");
  });

  it("confirmation email has items, totals, pickup and tracking link", () => {
    const email = orderConfirmedEmail(order, ctx);
    expect(email.subject).toBe("Order APW-1047 confirmed — Amioprowears");
    for (const part of [email.html, email.text]) {
      expect(part).toContain("Chidi");
      expect(part).toContain("SAKA | #7 | Badge: Premier League");
      expect(part).toContain("₦37,950");
      expect(part).toContain("Holy Ghost Park, Nsukka, Enugu");
      expect(part).toContain("valid ID");
      expect(part).toContain("https://amioprowears.com/track?order=APW-1047");
      expect(part).toContain("support@amioprowears.com");
    }
  });

  it("escapes customer-typed text in HTML", () => {
    const email = orderConfirmedEmail({ ...order, customer_name: "<script>x</script>", motor_park: 'A & "B"' }, ctx);
    expect(email.html).not.toContain("<script>");
    expect(email.html).toContain("A &amp; &quot;B&quot;");
    expect(escapeHtml("<a href='x'>")).toBe("&lt;a href=&#39;x&#39;&gt;");
  });

  it("dispatched email shows logistics details; delivered email thanks them", () => {
    const sent = orderStatusEmail(order, "dispatched", ctx);
    expect(sent.subject).toContain("on its way");
    expect(sent.text).toContain("Logistics: GIG Logistics · 0809 123 4567");
    expect(sent.text).toContain("Note: Waybill 12345");
    const bare = orderStatusEmail({ ...order, logistics_name: null, logistics_phone: null, dispatch_note: null }, "dispatched", ctx);
    expect(bare.text).not.toContain("Logistics:");
    expect(bare.text).not.toMatch(/\n\n\n/);

    const done = orderStatusEmail(order, "delivered", ctx);
    expect(done.subject).toContain("delivered");
    expect(done.html).toContain("https://amioprowears.com/catalogue");
  });

  it("cancelled email mentions the refund and the note", () => {
    const off = orderStatusEmail({ ...order, dispatch_note: "Size out of stock" }, "cancelled", ctx);
    expect(off.subject).toContain("cancelled");
    expect(off.text).toContain("refund");
    expect(off.text).toContain("Note: Size out of stock");
    expect(orderStatusEmail({ ...order, dispatch_note: null }, "cancelled", ctx).text).not.toMatch(/\n\n\n/);
  });
});

// ---------------------------------------------------------------------------
// Exactly-once orchestration
// ---------------------------------------------------------------------------

function setup(opts: { optIn?: boolean; failTelegram?: boolean; ownerEmail?: string } = {}) {
  let notifiedAt: string | null = null;
  const claimed: ClaimedOrder = { order: { ...order, newsletter_opt_in: opts.optIn ?? false }, paymentRef: "APW-1047-abc" };
  const deps = {
    // Like the SQL: only the caller that finds notified_at empty wins.
    claimOrder: vi.fn(async () => {
      await Promise.resolve();
      if (notifiedAt) return null;
      notifiedAt = "now";
      return claimed;
    }),
    sendEmail: vi.fn(async () => {}),
    sendTelegram: vi.fn(async () => {
      if (opts.failTelegram) throw new Error("bot blocked");
    }),
    subscribe: vi.fn(async () => {}),
    addAttentionNote: vi.fn(async () => {}),
    ctx,
    ownerEmail: opts.ownerEmail,
  } satisfies NotifyDeps;
  return deps;
}

describe("runOrderPaidNotifications", () => {
  it("sends customer email, Telegram and owner email once", async () => {
    const deps = setup({ ownerEmail: "admin@amioprowears.com" });
    const result = await runOrderPaidNotifications("ord1", deps);
    expect(result).toEqual({ claimed: true, failed: [] });
    expect(deps.sendTelegram).toHaveBeenCalledTimes(1);
    expect(deps.sendEmail).toHaveBeenCalledTimes(2);
    expect(deps.sendEmail.mock.calls.map((c) => (c as unknown as [{ to: { email: string } }])[0].to.email)).toEqual([
      "chidi@example.com",
      "admin@amioprowears.com",
    ]);
    expect(deps.subscribe).not.toHaveBeenCalled();
    expect(deps.addAttentionNote).not.toHaveBeenCalled();
  });

  it("verify and webhook at the same moment → messages sent exactly once", async () => {
    const deps = setup();
    const [a, b] = await Promise.all([runOrderPaidNotifications("ord1", deps), runOrderPaidNotifications("ord1", deps)]);
    expect([a.claimed, b.claimed].sort()).toEqual([false, true]);
    expect(deps.sendTelegram).toHaveBeenCalledTimes(1);
    expect(deps.sendEmail).toHaveBeenCalledTimes(1);
    // …and a later page reload sends nothing either.
    await runOrderPaidNotifications("ord1", deps);
    expect(deps.sendTelegram).toHaveBeenCalledTimes(1);
  });

  it("subscribes the customer when they ticked the newsletter box", async () => {
    const deps = setup({ optIn: true });
    await runOrderPaidNotifications("ord1", deps);
    expect(deps.subscribe).toHaveBeenCalledWith("chidi@example.com", "Chidi", "checkout");
  });

  it("one failed channel doesn't stop the others and flags the order", async () => {
    const deps = setup({ failTelegram: true });
    vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await runOrderPaidNotifications("ord1", deps);
    expect(result).toEqual({ claimed: true, failed: ["Telegram alert"] });
    expect(deps.sendEmail).toHaveBeenCalledTimes(1);
    expect(deps.addAttentionNote).toHaveBeenCalledWith("ord1", expect.stringContaining("Telegram alert"));
  });
});

describe("newsletterSchema", () => {
  it("cleans the email and allows a blank name", () => {
    expect(newsletterSchema.parse({ email: "  Ada@Example.COM ", firstName: "" })).toEqual({ email: "ada@example.com" });
    expect(newsletterSchema.parse({ email: "a@b.co", firstName: " Ada " })).toEqual({ email: "a@b.co", firstName: "Ada" });
    expect(newsletterSchema.safeParse({ email: "not-an-email" }).success).toBe(false);
  });
});
