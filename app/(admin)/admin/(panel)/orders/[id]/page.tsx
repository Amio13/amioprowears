import { CircleCheck, Printer, RotateCcw, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionButton } from "@/components/admin/ActionButton";
import { OrderItemPrint } from "@/components/admin/OrderItemPrint";
import { OrderStatusForm } from "@/components/admin/OrderStatusForm";
import { BackLink, Card, OrderStatusBadge, PageHeader, PaymentStatusBadge } from "@/components/admin/ui";
import { buttonClasses } from "@/components/ui/Button";
import { clearAttentionNote, markOrderRefunded } from "@/lib/admin/actions/orders";
import { requireAdmin } from "@/lib/admin/auth";
import { loadOrder } from "@/lib/admin/order-detail";
import { describeCustomisation } from "@/lib/customizer";
import { formatDateTime, formatNaira, formatPhoneForDisplay } from "@/lib/format";

export const metadata = { title: "Order" };

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1 text-sm">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}

export default async function OrderPage({ params }: PageProps<"/admin/orders/[id]">) {
  const { supabase } = await requireAdmin();
  const { id } = await params;
  const order = await loadOrder(supabase, id);
  if (!order) notFound();

  const canRefund = order.status === "cancelled" && (order.payment_status === "paid" || order.payment_status === "amount_mismatch");

  return (
    <>
      <BackLink href="/admin/orders">Orders</BackLink>
      <PageHeader
        title={order.order_number}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <OrderStatusBadge status={order.status} />
            <PaymentStatusBadge status={order.payment_status} />
            <span>Placed {formatDateTime(order.created_at)}</span>
          </span>
        }
        actions={
          <Link href={`/admin/orders/${order.id}/waybill`} className={buttonClasses({ variant: "secondary" })}>
            <Printer />
            Waybill slip
          </Link>
        }
      />

      {order.attention_note && (
        <div className="mb-4 rounded-2xl border border-amber-300 bg-amber-50 p-4">
          <h2 className="flex items-center gap-2 font-bold text-amber-900">
            <TriangleAlert className="size-5 shrink-0" />
            Needs your attention
          </h2>
          <p className="mt-1 whitespace-pre-line text-sm text-amber-900">{order.attention_note}</p>
          <ActionButton action={clearAttentionNote} input={{ orderId: order.id }} label="Mark as handled" icon={<CircleCheck />} className="mt-3" />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
        <div className="space-y-4">
          <Card title="Update status">
            <OrderStatusForm order={order} />
          </Card>

          <Card title={`Items (${order.order_items.reduce((n, i) => n + i.quantity, 0)})`}>
            <ul className="divide-y divide-line">
              {order.order_items.map((item) => {
                const custom = describeCustomisation({ customName: item.custom_name, customNumber: item.custom_number, badgeName: item.badge_name });
                return (
                  <li key={item.id} className="flex justify-between gap-4 py-3 text-sm">
                    <div>
                      <p className="font-medium">
                        {item.quantity} × {item.product_name}
                      </p>
                      <p className="text-muted">Size {item.size}</p>
                      {custom && <p className="font-medium text-brand">Print: {custom}</p>}
                      <OrderItemPrint item={item} />
                    </div>
                    <p className="whitespace-nowrap">{formatNaira(item.item_total)}</p>
                  </li>
                );
              })}
            </ul>
            <dl className="mt-2 border-t border-line pt-2">
              <Row label="Subtotal">{formatNaira(order.subtotal)}</Row>
              <Row label={`Delivery (Zone ${order.delivery_zone})`}>{formatNaira(order.delivery_fee)}</Row>
              {order.discount > 0 && <Row label={`Voucher ${order.voucher_code ?? ""}`}>-{formatNaira(order.discount)}</Row>}
              <Row label="Total">
                <strong>{formatNaira(order.total)}</strong>
              </Row>
            </dl>
          </Card>
        </div>

        <div className="space-y-4">
          <Card title="Customer">
            <dl>
              <Row label="Name">{order.customer_name}</Row>
              <Row label="Phone">
                <a href={`tel:+${order.phone}`} className="underline">
                  {formatPhoneForDisplay(order.phone)}
                </a>
              </Row>
              {order.alt_phone && (
                <Row label="Alt. phone">
                  <a href={`tel:+${order.alt_phone}`} className="underline">
                    {formatPhoneForDisplay(order.alt_phone)}
                  </a>
                </Row>
              )}
              <Row label="Email">
                <a href={`mailto:${order.email}`} className="break-all underline">
                  {order.email}
                </a>
              </Row>
            </dl>
          </Card>

          <Card title="Delivery">
            <dl>
              <Row label="Motor park">{order.motor_park}</Row>
              <Row label="City">{order.city}</Row>
              <Row label="State">
                {order.state} (Zone {order.delivery_zone})
              </Row>
            </dl>
            {order.notes && (
              <p className="mt-2 rounded-lg bg-surface p-3 text-sm">
                <span className="font-medium">Customer note:</span> {order.notes}
              </p>
            )}
          </Card>

          <Card title="Payment">
            <dl>
              <Row label="Status">
                <PaymentStatusBadge status={order.payment_status} />
              </Row>
              {order.paid_at && <Row label="Paid">{formatDateTime(order.paid_at)}</Row>}
            </dl>
            {order.payments.length > 0 && (
              <ul className="mt-2 space-y-2 border-t border-line pt-2 text-xs text-muted">
                {order.payments.map((p) => (
                  <li key={p.id}>
                    <span className="font-medium text-ink">{p.provider}</span> · {p.status} · {formatNaira(p.amount_paid ?? p.amount)}
                    <br />
                    <span className="break-all">Ref {p.reference}</span>
                  </li>
                ))}
              </ul>
            )}
            {canRefund && (
              <ActionButton
                action={markOrderRefunded}
                input={{ orderId: order.id }}
                label="Mark as refunded"
                icon={<RotateCcw />}
                confirm="Only do this after refunding in the Paystack dashboard. Mark as refunded?"
                className="mt-3"
              />
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
