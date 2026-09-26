import Link from "next/link";
import { notFound } from "next/navigation";
import { VoucherEditForm } from "@/components/admin/VoucherEditForm";
import { BackLink, Card, OrderStatusBadge, PageHeader, PaymentStatusBadge } from "@/components/admin/ui";
import { Badge } from "@/components/ui/Badge";
import { requireAdmin } from "@/lib/admin/auth";
import { describeDiscount, voucherState } from "@/lib/admin/labels";
import { formatDate, formatDateTime, formatNaira } from "@/lib/format";
import type { Order, Voucher } from "@/types";

export const metadata = { title: "Voucher" };

type OrderRow = Pick<Order, "id" | "order_number" | "customer_name" | "total" | "discount" | "status" | "payment_status" | "created_at">;

export default async function VoucherPage({ params }: PageProps<"/admin/vouchers/[id]">) {
  const { supabase } = await requireAdmin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const [voucher, orders] = await Promise.all([
    supabase.from("vouchers").select("*").eq("id", id).maybeSingle<Voucher>(),
    supabase
      .from("orders")
      .select("id, order_number, customer_name, total, discount, status, payment_status, created_at")
      .eq("voucher_id", id)
      .order("created_at", { ascending: false })
      .limit(200)
      .returns<OrderRow[]>(),
  ]);
  if (voucher.error || orders.error) throw new Error(`Loading voucher failed: ${(voucher.error ?? orders.error)!.message}`);
  const v = voucher.data;
  if (!v) notFound();

  const paid = orders.data.filter((o) => o.payment_status === "paid");
  const state = voucherState(v);
  let productNames: string[] = [];
  if (v.product_ids?.length) {
    const { data } = await supabase.from("products").select("name").in("id", v.product_ids).returns<{ name: string }[]>();
    productNames = (data ?? []).map((p) => p.name);
  }

  return (
    <>
      <BackLink href="/admin/vouchers">Vouchers</BackLink>
      <PageHeader
        title={v.code}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <Badge tone={state.tone}>{state.label}</Badge> {describeDiscount(v, formatNaira)}
          </span>
        }
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Rules">
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Minimum order</dt>
              <dd>{v.min_order_value ? formatNaira(v.min_order_value) : "None"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Jerseys</dt>
              <dd className="text-right">{productNames.length ? productNames.join(", ") : "All"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Created</dt>
              <dd>{formatDate(v.created_at)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Paid orders</dt>
              <dd>{paid.length}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Sales with this code</dt>
              <dd>{formatNaira(paid.reduce((s, o) => s + o.total, 0))}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Total discount given</dt>
              <dd>{formatNaira(paid.reduce((s, o) => s + o.discount, 0))}</dd>
            </div>
          </dl>
        </Card>
        <Card title="Edit">
          <VoucherEditForm voucher={v} />
        </Card>
      </div>

      <Card title="Orders that used it" className="mt-4">
        {orders.data.length === 0 ? (
          <p className="text-sm text-muted">Not used yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {orders.data.map((o) => (
              <li key={o.id}>
                <Link href={`/admin/orders/${o.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm hover:bg-surface">
                  <span className="font-bold">{o.order_number}</span>
                  <span className="min-w-0 flex-1 truncate">{o.customer_name}</span>
                  <span>{formatNaira(o.total)}</span>
                  <OrderStatusBadge status={o.status} />
                  <PaymentStatusBadge status={o.payment_status} />
                  <span className="text-xs text-muted">{formatDateTime(o.created_at)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
