/**
 * Order list filters (admin → Orders). Pure helpers so they can be tested; the page
 * turns them into a Supabase query.
 */
import { lagosDayStart } from "@/lib/format";
import type { OrderStatus } from "@/types";
import { ORDER_STATUSES } from "./schemas";

export const PAYMENT_FILTERS = [
  { value: "paid", label: "Paid" }, // includes refunded / amount mismatch — money moved
  { value: "unpaid", label: "Not paid" }, // abandoned or failed checkouts
  { value: "all", label: "All" },
] as const;
export type PaymentFilter = (typeof PAYMENT_FILTERS)[number]["value"];

export interface OrderFilters {
  status: OrderStatus | null;
  pay: PaymentFilter;
  from: string | null; // YYYY-MM-DD (Lagos)
  to: string | null;
  q: string;
  page: number;
}

type Params = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const isDay = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));

export function parseOrderFilters(params: Params): OrderFilters {
  const status = one(params.status);
  const pay = one(params.pay);
  const page = Number.parseInt(one(params.page), 10);
  return {
    status: (ORDER_STATUSES as readonly string[]).includes(status) ? (status as OrderStatus) : null,
    pay: PAYMENT_FILTERS.some((p) => p.value === pay) ? (pay as PaymentFilter) : "paid",
    from: isDay(one(params.from)) ? one(params.from) : null,
    to: isDay(one(params.to)) ? one(params.to) : null,
    q: one(params.q).trim().slice(0, 60),
    page: Number.isFinite(page) && page > 1 ? page : 1,
  };
}

export function paymentStatusesFor(pay: PaymentFilter): string[] | null {
  if (pay === "paid") return ["paid", "amount_mismatch", "refunded"];
  if (pay === "unpaid") return ["unpaid", "failed"];
  return null;
}

/** Date range as UTC ISO strings: [start of `from`, start of the day after `to`). */
export function dateRange(f: Pick<OrderFilters, "from" | "to">): { gte?: string; lt?: string } {
  return {
    gte: f.from ? lagosDayStart(f.from).toISOString() : undefined,
    lt: f.to ? new Date(lagosDayStart(f.to).getTime() + 86_400_000).toISOString() : undefined,
  };
}

/**
 * Search box → a PostgREST `or` filter over order number, name, email and phone.
 * Characters that mean something to PostgREST are removed, and values are quoted.
 * Phone numbers are stored as 234XXXXXXXXXX, so "0803 123" searches for "803123".
 */
export function orderSearchFilter(q: string): string | null {
  const clean = q.replace(/[^\p{L}\p{N} @.\-_']/gu, "").replace(/\s+/g, " ").trim();
  if (!clean) return null;
  const like = (col: string, v: string) => `${col}.ilike."*${v}*"`;
  const parts = [like("order_number", clean), like("customer_name", clean), like("email", clean)];
  const digits = clean.replace(/\D/g, "");
  if (digits.length >= 4 && digits.length === clean.replace(/[\s-]/g, "").length) {
    parts.push(like("phone", digits.replace(/^0/, "")));
  }
  return parts.join(",");
}

/** Keep the current filters when linking to another page of results. */
export function filtersToSearch(f: OrderFilters, overrides: Partial<OrderFilters> = {}): string {
  const merged = { ...f, ...overrides };
  const p = new URLSearchParams();
  if (merged.status) p.set("status", merged.status);
  if (merged.pay !== "paid") p.set("pay", merged.pay);
  if (merged.from) p.set("from", merged.from);
  if (merged.to) p.set("to", merged.to);
  if (merged.q) p.set("q", merged.q);
  if (merged.page > 1) p.set("page", String(merged.page));
  const s = p.toString();
  return s ? `?${s}` : "";
}
