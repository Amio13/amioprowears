/**
 * Sales overview maths (admin → Analytics). Pure functions over paid orders, so the
 * Worker does one DB read and a little arithmetic. Periods use Nigerian time (WAT).
 */
import { lagosDay, lagosDayStart } from "@/lib/format";
import { paystackFee } from "@/lib/pricing";
import type { DeliveryZone } from "@/types";

export interface AnalyticsOrder {
  total: number;
  discount: number;
  paid_at: string;
  state: string;
  delivery_zone: DeliveryZone;
  voucher_code: string | null;
  order_items: { product_name: string; quantity: number; item_total: number }[];
}

export const PERIODS = [
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
] as const;
export type Period = (typeof PERIODS)[number]["value"];

/** When a period started (Lagos time). Weeks start on Monday. */
export function periodStart(period: Period, now: Date): Date {
  const today = lagosDay(now); // "YYYY-MM-DD"
  if (period === "today") return lagosDayStart(today);
  if (period === "month") return lagosDayStart(`${today.slice(0, 8)}01`);
  const dayOfWeek = new Date(`${today}T00:00:00Z`).getUTCDay(); // 0 = Sunday
  const daysSinceMonday = (dayOfWeek + 6) % 7;
  return new Date(lagosDayStart(today).getTime() - daysSinceMonday * 86_400_000);
}

/** The earliest start of all periods — load paid orders from here. */
export function earliestPeriodStart(now: Date): Date {
  return new Date(Math.min(...PERIODS.map((p) => periodStart(p.value, now).getTime())));
}

export function ordersSince<T extends { paid_at: string }>(orders: T[], start: Date): T[] {
  const t = start.getTime();
  return orders.filter((o) => Date.parse(o.paid_at) >= t);
}

export interface Totals {
  orders: number;
  revenue: number; // what customers paid (items + delivery − discounts)
  fees: number; // estimated Paystack fees
  net: number; // revenue − fees
}

export function totals(orders: Pick<AnalyticsOrder, "total">[]): Totals {
  const revenue = orders.reduce((s, o) => s + o.total, 0);
  const fees = Math.round(orders.reduce((s, o) => s + paystackFee(o.total), 0));
  return { orders: orders.length, revenue, fees, net: revenue - fees };
}

interface Row {
  key: string;
  orders: number;
  quantity: number;
  revenue: number;
  discount: number;
}

function group<T>(items: T[], key: (i: T) => string, add: (row: Row, i: T) => void): Row[] {
  const rows = new Map<string, Row>();
  for (const i of items) {
    const k = key(i);
    let row = rows.get(k);
    if (!row) rows.set(k, (row = { key: k, orders: 0, quantity: 0, revenue: 0, discount: 0 }));
    add(row, i);
  }
  return [...rows.values()];
}

export function breakdown(orders: AnalyticsOrder[]) {
  const items = orders.flatMap((o) => o.order_items);
  const topProducts = group(items, (i) => i.product_name, (r, i) => {
    r.quantity += i.quantity;
    r.revenue += i.item_total;
  }).sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue);

  const perOrder = (r: Row, o: AnalyticsOrder) => {
    r.orders += 1;
    r.revenue += o.total;
    r.discount += o.discount;
  };
  const byState = group(orders, (o) => o.state, perOrder).sort((a, b) => b.orders - a.orders || b.revenue - a.revenue);
  const byZone = group(orders, (o) => o.delivery_zone, perOrder).sort((a, b) => a.key.localeCompare(b.key));
  const vouchers = group(
    orders.filter((o) => o.voucher_code),
    (o) => o.voucher_code!,
    perOrder,
  ).sort((a, b) => b.orders - a.orders);

  return { topProducts, byState, byZone, vouchers };
}
