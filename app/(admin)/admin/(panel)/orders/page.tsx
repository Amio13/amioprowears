import Form from "next/form";
import Link from "next/link";
import { Card, Empty, OrderStatusBadge, PageHeader, PaymentStatusBadge } from "@/components/admin/ui";
import { buttonClasses } from "@/components/ui/Button";
import { fieldClasses } from "@/components/ui/Input";
import { requireAdmin } from "@/lib/admin/auth";
import { ORDER_STATUS } from "@/lib/admin/labels";
import { dateRange, filtersToSearch, orderSearchFilter, parseOrderFilters, PAYMENT_FILTERS, paymentStatusesFor } from "@/lib/admin/orders";
import { ORDER_STATUSES } from "@/lib/admin/schemas";
import { formatDateTime, formatNaira } from "@/lib/format";
import type { Order } from "@/types";

export const metadata = { title: "Orders" };

const PAGE_SIZE = 30;
type Row = Pick<Order, "id" | "order_number" | "customer_name" | "state" | "total" | "status" | "payment_status" | "created_at" | "attention_note">;

export default async function OrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  const { supabase } = await requireAdmin();
  const f = parseOrderFilters(await searchParams);

  let query = supabase
    .from("orders")
    .select("id, order_number, customer_name, state, total, status, payment_status, created_at, attention_note", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((f.page - 1) * PAGE_SIZE, f.page * PAGE_SIZE - 1);
  if (f.status) query = query.eq("status", f.status);
  const pays = paymentStatusesFor(f.pay);
  if (pays) query = query.in("payment_status", pays);
  const { gte, lt } = dateRange(f);
  if (gte) query = query.gte("created_at", gte);
  if (lt) query = query.lt("created_at", lt);
  const search = orderSearchFilter(f.q);
  if (search) query = query.or(search);

  const { data, count, error } = await query.returns<Row[]>();
  if (error) throw new Error(`Loading orders failed: ${error.message}`);
  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <PageHeader title="Orders" description={`${total} order${total === 1 ? "" : "s"}`} />

      <Card className="mb-4">
        <Form action="/admin/orders" className="grid grid-cols-2 gap-3 md:grid-cols-6 md:items-end">
          <label className="col-span-2 block text-sm font-medium">
            Search
            <input name="q" defaultValue={f.q} placeholder="Order no., name, phone or email" className={`${fieldClasses} mt-1`} />
          </label>
          <label className="block text-sm font-medium">
            Status
            <select name="status" defaultValue={f.status ?? ""} className={`${fieldClasses} mt-1`}>
              <option value="">Any</option>
              {ORDER_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {ORDER_STATUS[s].label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium">
            Payment
            <select name="pay" defaultValue={f.pay} className={`${fieldClasses} mt-1`}>
              {PAYMENT_FILTERS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium">
            From
            <input type="date" name="from" defaultValue={f.from ?? ""} className={`${fieldClasses} mt-1`} />
          </label>
          <label className="block text-sm font-medium">
            To
            <input type="date" name="to" defaultValue={f.to ?? ""} className={`${fieldClasses} mt-1`} />
          </label>
          <div className="col-span-2 flex gap-2 md:col-span-6">
            <button type="submit" className={buttonClasses()}>
              Apply filters
            </button>
            <Link href="/admin/orders" className={buttonClasses({ variant: "ghost" })}>
              Clear
            </Link>
          </div>
        </Form>
      </Card>

      {data.length === 0 ? (
        <Empty>No orders match these filters.</Empty>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl bg-white shadow-sm">
          {data.map((o) => (
            <li key={o.id}>
              <Link href={`/admin/orders/${o.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-surface">
                <span className="w-24 font-bold">{o.order_number}</span>
                <span className="min-w-0 flex-1 truncate">
                  {o.customer_name} <span className="text-muted">· {o.state}</span>
                </span>
                <span className="font-medium">{formatNaira(o.total)}</span>
                <span className="flex w-full items-center gap-2 md:w-auto">
                  <OrderStatusBadge status={o.status} />
                  <PaymentStatusBadge status={o.payment_status} />
                  {o.attention_note && (
                    <span className="text-sm font-medium text-amber-700" title={o.attention_note}>
                      ⚠ Check
                    </span>
                  )}
                  <span className="ml-auto text-xs text-muted md:ml-2 md:w-32 md:text-right">{formatDateTime(o.created_at)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {pages > 1 && (
        <nav aria-label="Pages" className="mt-4 flex items-center justify-between text-sm">
          {f.page > 1 ? (
            <Link href={`/admin/orders${filtersToSearch(f, { page: f.page - 1 })}`} className={buttonClasses({ variant: "secondary" })}>
              ← Newer
            </Link>
          ) : (
            <span />
          )}
          <span className="text-muted">
            Page {f.page} of {pages}
          </span>
          {f.page < pages ? (
            <Link href={`/admin/orders${filtersToSearch(f, { page: f.page + 1 })}`} className={buttonClasses({ variant: "secondary" })}>
              Older →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </>
  );
}
