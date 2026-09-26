import type { OrderStatus, PaymentStatus } from "@/types";

type Tone = "neutral" | "brand" | "success" | "warning" | "info";

export const ORDER_STATUS: Record<OrderStatus, { label: string; tone: Tone }> = {
  pending: { label: "Pending", tone: "warning" },
  processing: { label: "Processing", tone: "info" },
  dispatched: { label: "Dispatched", tone: "info" },
  delivered: { label: "Delivered", tone: "success" },
  cancelled: { label: "Cancelled", tone: "neutral" },
};

export const PAYMENT_STATUS: Record<PaymentStatus, { label: string; tone: Tone }> = {
  unpaid: { label: "Unpaid", tone: "neutral" },
  paid: { label: "Paid", tone: "success" },
  failed: { label: "Failed", tone: "neutral" },
  amount_mismatch: { label: "Amount mismatch", tone: "brand" },
  refunded: { label: "Refunded", tone: "neutral" },
};

/** "10% off (max ₦2,000)" or "₦1,000 off". */
export function describeDiscount(
  v: { discount_type: "percent" | "fixed"; discount_value: number; max_discount: number | null },
  naira: (n: number) => string,
): string {
  if (v.discount_type === "fixed") return `${naira(v.discount_value)} off`;
  return `${v.discount_value}% off${v.max_discount ? ` (max ${naira(v.max_discount)})` : ""}`;
}

export function voucherState(
  v: { is_active: boolean; used_count: number; max_uses: number; expires_at: string | null },
  now = Date.now(),
): { label: string; tone: Tone } {
  if (!v.is_active) return { label: "Off", tone: "neutral" };
  if (v.used_count >= v.max_uses) return { label: "Used up", tone: "neutral" };
  if (v.expires_at && Date.parse(v.expires_at) < now) return { label: "Expired", tone: "neutral" };
  return { label: "Active", tone: "success" };
}
