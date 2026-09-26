import Link from "next/link";
import { Card, OrderStatusBadge, PageHeader } from "@/components/admin/ui";
import { buttonClasses } from "@/components/ui/Button";
import { ordersSince, periodStart, totals } from "@/lib/admin/analytics";
import { requireAdmin } from "@/lib/admin/auth";
import { formatDateTime, formatNaira } from "@/lib/format";
import type { Order } from "@/types";

export const metadata = { title: "Dashboard" };

type Row = Pick<Order, "id" | "order_number" | "customer_name" | "total" | "status" | "created_at" | "attention_note">;
const ROW_FIELDS = "id, order_number, customer_name, total, status, created_at, attention_note";

function OrderList({ orders }: { orders: Row[] }) {
  return (
    <ul className="-mx-4 divide-y divide-line md:-mx-5">
      {orders.map((o) => (
        <li key={o.id}>
          <Link href={`/admin/orders/${o.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-sm hover:bg-surface md:px-5">
            <span className="font-bold">{o.order_number}</span>
            <span className="min-w-0 flex-1 truncate">{o.customer_name}</span>
            <span>{formatNaira(o.total)}</span>
            <OrderStatusBadge status={o.status} />
            <span className="w-full text-xs text-muted">
              {formatDateTime(o.created_at)}
              {o.attention_note && <span className="text-amber-800"> · ⚠ {o.attention_note.split("\n")[0]}</span>}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default async function DashboardPage() {
  const { supabase } = await requireAdmin();
  const now = new Date();

  const [todo, attention, sales, unsynced] = await Promise.all([
    supabase
      .from("orders")
      .select(ROW_FIELDS, { count: "exact" })
      .eq("payment_status", "paid")
      .in("status", ["pending", "processing"])
      .order("created_at")
      .limit(20)
      .returns<Row[]>(),
    supabase.from("orders").select(ROW_FIELDS).not("attention_note", "is", null).order("created_at", { ascending: false }).limit(10).returns<Row[]>(),
    supabase
      .from("orders")
      .select("total, paid_at")
      .eq("payment_status", "paid")
      .gte("paid_at", periodStart("month", now).toISOString())
      .returns<{ total: number; paid_at: string }[]>(),
    supabase.from("newsletter_subscribers").select("id", { count: "exact", head: true }).eq("brevo_synced", false).eq("is_active", true),
  ]);
  for (const r of [todo, attention, sales]) if (r.error) throw new Error(`Loading dashboard failed: ${r.error.message}`);

  const today = totals(ordersSince(sales.data!, periodStart("today", now)));
  const month = totals(sales.data!);

  return (
    <>
      <PageHeader
        title="Dashboard"
        actions={
          <>
            <Link href="/admin/products/new" className={buttonClasses()}>
              + Add jersey
            </Link>
            <Link href="/admin/vouchers" className={buttonClasses({ variant: "secondary" })}>
              New voucher
            </Link>
          </>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3">
        <Link href="/admin/analytics?period=today" className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-sm text-muted">Today</p>
          <p className="text-xl font-bold">{formatNaira(today.revenue)}</p>
          <p className="text-sm">
            {today.orders} order{today.orders === 1 ? "" : "s"}
          </p>
        </Link>
        <Link href="/admin/analytics?period=month" className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-sm text-muted">This month</p>
          <p className="text-xl font-bold">{formatNaira(month.revenue)}</p>
          <p className="text-sm">
            {month.orders} order{month.orders === 1 ? "" : "s"}
          </p>
        </Link>
        <Link href="/admin/orders?status=pending" className="col-span-2 rounded-2xl bg-white p-4 shadow-sm md:col-span-1">
          <p className="text-sm text-muted">To fulfil</p>
          <p className="text-xl font-bold">{todo.count ?? 0}</p>
          <p className="text-sm">paid, not yet dispatched</p>
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="To fulfil (oldest first)" actions={<Link href="/admin/orders" className="text-sm underline">All orders</Link>}>
          {todo.data!.length ? <OrderList orders={todo.data!} /> : <p className="text-sm text-muted">Nothing waiting. 🎉</p>}
        </Card>
        <div className="space-y-4">
          {attention.data!.length > 0 && (
            <Card title="Needs your attention">
              <OrderList orders={attention.data!} />
            </Card>
          )}
          {(unsynced.count ?? 0) > 0 && (
            <Card title="Newsletter">
              <p className="text-sm">
                {unsynced.count} subscriber{unsynced.count === 1 ? " isn't" : "s aren't"} in Brevo yet.{" "}
                <Link href="/admin/newsletter" className="underline">
                  Sync now
                </Link>
              </p>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
