import "server-only";
import type { AdminContext } from "./auth";
import type { Order, OrderItem, Payment } from "@/types";

export type OrderDetail = Order & {
  order_items: OrderItem[];
  payments: Pick<Payment, "id" | "provider" | "reference" | "amount" | "amount_paid" | "status" | "created_at" | "confirmed_at">[];
};

/** One order with its items and payment attempts, in a single request. */
export async function loadOrder(supabase: AdminContext["supabase"], id: string): Promise<OrderDetail | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data, error } = await supabase
    .from("orders")
    .select("*, order_items(*), payments(id, provider, reference, amount, amount_paid, status, created_at, confirmed_at)")
    .eq("id", id)
    .maybeSingle<OrderDetail>();
  if (error) throw new Error(`Loading order failed: ${error.message}`);
  return data;
}
