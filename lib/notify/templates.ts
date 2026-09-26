/**
 * Message text for every notification. Pure functions (no network, no env) so they
 * are unit-tested and cheap to run on the Worker. Emails are simple inline-styled
 * HTML that reads well on a phone, plus a plain-text version.
 */
import { formatNaira, formatPhoneForDisplay, whatsappLink } from "@/lib/format";
import type { Order, OrderItem } from "@/types";

export type NotifyOrder = Pick<
  Order,
  | "id"
  | "order_number"
  | "customer_name"
  | "phone"
  | "alt_phone"
  | "email"
  | "state"
  | "city"
  | "motor_park"
  | "delivery_zone"
  | "delivery_fee"
  | "subtotal"
  | "discount"
  | "total"
  | "voucher_code"
  | "notes"
  | "logistics_name"
  | "logistics_phone"
  | "dispatch_note"
> & {
  items: Pick<OrderItem, "product_name" | "size" | "custom_name" | "custom_number" | "badge_name" | "quantity" | "item_total">[];
};

export interface StoreContext {
  storeName: string;
  siteUrl: string; // no trailing slash
  supportEmail?: string;
  supportPhone?: string; // 234XXXXXXXXXX
  whatsappNumber?: string; // 234XXXXXXXXXX
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

const BRAND = "#dc2626";
const INK = "#171717";
const MUTED = "#525252";
const LINE = "#e5e5e5";

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** "Custom: MESSI | #10 | Badge: UCL" — or "" for a plain jersey. */
export function customLine(item: NotifyOrder["items"][number]): string {
  const parts: string[] = [];
  if (item.custom_name) parts.push(item.custom_name);
  if (item.custom_number) parts.push(`#${item.custom_number}`);
  if (item.badge_name) parts.push(`Badge: ${item.badge_name}`);
  return parts.join(" | ");
}

const firstName = (full: string) => full.trim().split(/\s+/)[0] || "there";
const trackUrl = (o: NotifyOrder, ctx: StoreContext) => `${ctx.siteUrl}/track?order=${encodeURIComponent(o.order_number)}`;

export const PICKUP_TEXT =
  "The logistics company will call the phone number you gave us when it arrives. " +
  "Bring your order number and a valid ID to pick it up.";

// ---------------------------------------------------------------------------
// Owner alert (Telegram + email copy) — format from docs/SPEC.md 3.7
// ---------------------------------------------------------------------------

export function ownerAlertText(o: NotifyOrder, ctx: StoreContext, paymentRef: string | null): string {
  const rule = "─────────────────────────";
  const lines = [
    `🛒 NEW ORDER #${o.order_number}`,
    `Customer: ${o.customer_name}`,
    `Phone: ${formatPhoneForDisplay(o.phone)}` + (o.alt_phone ? `  Alt: ${formatPhoneForDisplay(o.alt_phone)}` : ""),
    `Email: ${o.email}`,
    `Motor park: ${o.motor_park}, ${o.city}, ${o.state}`,
    rule,
  ];
  for (const item of o.items) {
    lines.push(`${item.product_name} — ${item.size} × ${item.quantity}`);
    const custom = customLine(item);
    if (custom) lines.push(`Custom: ${custom}`);
  }
  lines.push(rule, `Subtotal: ${formatNaira(o.subtotal)}`, `Delivery (Zone ${o.delivery_zone}): ${formatNaira(o.delivery_fee)}`);
  if (o.discount > 0) lines.push(`Voucher ${o.voucher_code ?? ""}: -${formatNaira(o.discount)}`);
  lines.push(`Total paid: ${formatNaira(o.total)} ✅`);
  if (paymentRef) lines.push(`Paystack ref: ${paymentRef}`);
  if (o.notes) lines.push(`Notes: ${o.notes}`);
  lines.push(`Admin: ${ctx.siteUrl}/admin/orders/${o.id}`);
  return lines.join("\n");
}

export function ownerAlertEmail(o: NotifyOrder, ctx: StoreContext, paymentRef: string | null): RenderedEmail {
  const text = ownerAlertText(o, ctx, paymentRef);
  return {
    subject: `New order ${o.order_number} — ${formatNaira(o.total)}`,
    text,
    html: `<pre style="font-family:ui-monospace,Menlo,Consolas,monospace;font-size:14px;line-height:1.5;white-space:pre-wrap;color:${INK}">${escapeHtml(text)}</pre>`,
  };
}

// ---------------------------------------------------------------------------
// Customer emails
// ---------------------------------------------------------------------------

function layout(ctx: StoreContext, bodyHtml: string): string {
  const contact: string[] = [];
  if (ctx.supportEmail) contact.push(`<a href="mailto:${escapeHtml(ctx.supportEmail)}" style="color:${MUTED}">${escapeHtml(ctx.supportEmail)}</a>`);
  if (ctx.supportPhone) contact.push(escapeHtml(formatPhoneForDisplay(ctx.supportPhone)));
  if (ctx.whatsappNumber) {
    const wa = whatsappLink(ctx.whatsappNumber, `Hi, I need help with an order on ${ctx.storeName}`);
    contact.push(`<a href="${escapeHtml(wa)}" style="color:${MUTED}">Chat on WhatsApp</a>`);
  }
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5"><tr><td align="center" style="padding:16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:8px;font-family:Roboto,Arial,Helvetica,sans-serif;color:${INK};font-size:15px;line-height:1.5">
<tr><td style="padding:20px 24px;border-bottom:3px solid ${BRAND}"><a href="${escapeHtml(ctx.siteUrl)}" style="font-size:24px;font-weight:700;letter-spacing:1px;color:${INK};text-decoration:none">${escapeHtml(ctx.storeName.toUpperCase())}</a></td></tr>
<tr><td style="padding:24px">${bodyHtml}</td></tr>
<tr><td style="padding:16px 24px;border-top:1px solid ${LINE};font-size:13px;color:${MUTED}">Questions? Reply to this email${contact.length ? ` or reach us: ${contact.join(" · ")}` : ""}.</td></tr>
</table></td></tr></table></body></html>`;
}

function button(href: string, label: string): string {
  return `<p style="margin:24px 0"><a href="${escapeHtml(href)}" style="display:inline-block;background:${BRAND};color:#ffffff;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:6px">${escapeHtml(label)}</a></p>`;
}

function itemsHtml(o: NotifyOrder): string {
  const rows = o.items
    .map((item) => {
      const custom = customLine(item);
      return `<tr><td style="padding:8px 0;border-bottom:1px solid ${LINE}"><strong>${escapeHtml(item.product_name)}</strong><br>
<span style="color:${MUTED};font-size:13px">Size ${escapeHtml(item.size)} · Qty ${item.quantity}${custom ? ` · ${escapeHtml(custom)}` : ""}</span></td>
<td align="right" style="padding:8px 0;border-bottom:1px solid ${LINE};white-space:nowrap;vertical-align:top">${formatNaira(item.item_total)}</td></tr>`;
    })
    .join("");
  const row = (label: string, value: string, bold = false) =>
    `<tr><td style="padding:4px 0${bold ? ";font-weight:700;font-size:16px" : ""}">${escapeHtml(label)}</td><td align="right" style="padding:4px 0${bold ? ";font-weight:700;font-size:16px" : ""}">${value}</td></tr>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}
${row("Subtotal", formatNaira(o.subtotal))}
${row(`Delivery (Zone ${o.delivery_zone})`, formatNaira(o.delivery_fee))}
${o.discount > 0 ? row(`Voucher ${o.voucher_code ?? ""}`, `-${formatNaira(o.discount)}`) : ""}
${row("Total paid", formatNaira(o.total), true)}</table>`;
}

function itemsText(o: NotifyOrder): string {
  const lines = o.items.map((item) => {
    const custom = customLine(item);
    return `- ${item.product_name} (Size ${item.size} × ${item.quantity})${custom ? ` — ${custom}` : ""}: ${formatNaira(item.item_total)}`;
  });
  lines.push(`Subtotal: ${formatNaira(o.subtotal)}`, `Delivery (Zone ${o.delivery_zone}): ${formatNaira(o.delivery_fee)}`);
  if (o.discount > 0) lines.push(`Voucher ${o.voucher_code ?? ""}: -${formatNaira(o.discount)}`);
  lines.push(`Total paid: ${formatNaira(o.total)}`);
  return lines.join("\n");
}

function contactText(ctx: StoreContext): string {
  const parts: string[] = [];
  if (ctx.supportEmail) parts.push(ctx.supportEmail);
  if (ctx.supportPhone) parts.push(formatPhoneForDisplay(ctx.supportPhone));
  return parts.length ? `Questions? Reply to this email or reach us: ${parts.join(" · ")}` : "Questions? Reply to this email.";
}

export function orderConfirmedEmail(o: NotifyOrder, ctx: StoreContext): RenderedEmail {
  const where = `${o.motor_park}, ${o.city}, ${o.state}`;
  const html = layout(
    ctx,
    `<h1 style="margin:0 0 8px;font-size:22px">Thanks, ${escapeHtml(firstName(o.customer_name))} — your order is confirmed</h1>
<p style="margin:0 0 16px;color:${MUTED}">Order <strong style="color:${INK}">${escapeHtml(o.order_number)}</strong> is paid. We're preparing it now.</p>
${itemsHtml(o)}
<h2 style="margin:24px 0 8px;font-size:17px">Picking up your order</h2>
<p style="margin:0">We'll send it to <strong>${escapeHtml(where)}</strong>. ${escapeHtml(PICKUP_TEXT)} Your order number is <strong>${escapeHtml(o.order_number)}</strong>.</p>
${button(trackUrl(o, ctx), "Track your order")}`,
  );
  const text = [
    `Thanks, ${firstName(o.customer_name)} — your order ${o.order_number} is confirmed and paid.`,
    "",
    itemsText(o),
    "",
    `Pickup: we'll send it to ${where}. ${PICKUP_TEXT}`,
    "",
    `Track your order: ${trackUrl(o, ctx)}`,
    "",
    contactText(ctx),
  ].join("\n");
  return { subject: `Order ${o.order_number} confirmed — ${ctx.storeName}`, html, text };
}

/** Statuses the customer can be emailed about. ("Processing" is covered by the confirmation email.) */
export const CUSTOMER_STATUSES = ["dispatched", "delivered", "cancelled"] as const;
export type CustomerStatus = (typeof CUSTOMER_STATUSES)[number];

export function orderStatusEmail(o: NotifyOrder, status: CustomerStatus, ctx: StoreContext): RenderedEmail {
  if (status === "cancelled") {
    const intro = `Hi ${firstName(o.customer_name)}, order ${o.order_number} has been cancelled.`;
    const refund = "If you already paid, we'll refund you in full — refunds usually reach your bank within a few working days.";
    const html = layout(
      ctx,
      `<h1 style="margin:0 0 8px;font-size:22px">Your order has been cancelled</h1>
<p style="margin:0 0 16px">${escapeHtml(intro)}</p>
${o.dispatch_note ? `<p style="margin:0 0 16px"><strong>Note:</strong> ${escapeHtml(o.dispatch_note)}</p>` : ""}
<p style="margin:0">${escapeHtml(refund)} If you have any questions, just reply to this email.</p>`,
    );
    const text = [intro, o.dispatch_note ? `Note: ${o.dispatch_note}` : "", "", refund, "", contactText(ctx)]
      .filter((l, i, all) => l !== "" || all[i - 1] !== "")
      .join("\n");
    return { subject: `Order ${o.order_number} cancelled`, html, text };
  }

  if (status === "dispatched") {
    const where = `${o.motor_park}, ${o.city}, ${o.state}`;
    const logistics = [o.logistics_name, o.logistics_phone ? formatPhoneForDisplay(o.logistics_phone) : null].filter(Boolean).join(" · ");
    const html = layout(
      ctx,
      `<h1 style="margin:0 0 8px;font-size:22px">Your order is on its way</h1>
<p style="margin:0 0 16px">Good news, ${escapeHtml(firstName(o.customer_name))}! Order <strong>${escapeHtml(o.order_number)}</strong> has been sent to <strong>${escapeHtml(where)}</strong>.</p>
${logistics ? `<p style="margin:0 0 8px"><strong>Logistics:</strong> ${escapeHtml(logistics)}</p>` : ""}
${o.dispatch_note ? `<p style="margin:0 0 8px"><strong>Note:</strong> ${escapeHtml(o.dispatch_note)}</p>` : ""}
<p style="margin:16px 0 0">${escapeHtml(PICKUP_TEXT)}</p>
${button(trackUrl(o, ctx), "Track your order")}`,
    );
    const text = [
      `Good news, ${firstName(o.customer_name)}! Order ${o.order_number} has been sent to ${where}.`,
      logistics ? `Logistics: ${logistics}` : "",
      o.dispatch_note ? `Note: ${o.dispatch_note}` : "",
      "",
      PICKUP_TEXT,
      "",
      `Track your order: ${trackUrl(o, ctx)}`,
      "",
      contactText(ctx),
    ]
      .filter((l, i, all) => l !== "" || all[i - 1] !== "")
      .join("\n");
    return { subject: `Order ${o.order_number} is on its way`, html, text };
  }

  const html = layout(
    ctx,
    `<h1 style="margin:0 0 8px;font-size:22px">Enjoy your jersey!</h1>
<p style="margin:0 0 16px">Thanks for shopping with us, ${escapeHtml(firstName(o.customer_name))}. Order <strong>${escapeHtml(o.order_number)}</strong> has been delivered.</p>
<p style="margin:0">We'd love to see it on you — send us a photo or tell us how we did. It really helps a small business.</p>
${button(`${ctx.siteUrl}/catalogue`, "Shop new drops")}`,
  );
  const text = [
    `Thanks for shopping with us, ${firstName(o.customer_name)}. Order ${o.order_number} has been delivered.`,
    "We'd love to see it on you — send us a photo or tell us how we did. It really helps a small business.",
    "",
    `Shop new drops: ${ctx.siteUrl}/catalogue`,
    "",
    contactText(ctx),
  ].join("\n");
  return { subject: `Order ${o.order_number} delivered — thank you!`, html, text };
}
