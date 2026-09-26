import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/admin/PrintButton";
import { requireAdmin } from "@/lib/admin/auth";
import { loadOrder } from "@/lib/admin/order-detail";
import { describeCustomisation } from "@/lib/customizer";
import { formatDate, formatPhoneForDisplay } from "@/lib/format";

export const metadata = { title: "Waybill" };

/** Slip to tape to the parcel for the logistics company. Big text, no prices. */
export default async function WaybillPage({ params }: PageProps<"/admin/orders/[id]/waybill">) {
  const { supabase } = await requireAdmin();
  const { id } = await params;
  const order = await loadOrder(supabase, id);
  if (!order) notFound();
  const storeName = process.env.NEXT_PUBLIC_STORE_NAME || "Amioprowears";
  const support = process.env.NEXT_PUBLIC_SUPPORT_PHONE;

  return (
    <>
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link href={`/admin/orders/${order.id}`} className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted hover:text-ink">
          <ArrowLeft className="size-4" />
          Back to order
        </Link>
        <PrintButton />
      </div>
      <article className="mx-auto max-w-xl rounded-2xl border-2 border-ink bg-white p-6 text-ink print:max-w-none print:rounded-none print:border-2">
        <header className="flex items-start justify-between border-b-2 border-ink pb-3">
          <div>
            <p className="font-display text-3xl leading-none tracking-wide">{storeName.toUpperCase()}</p>
            {support && <p className="text-sm">Sender: {formatPhoneForDisplay(support)}</p>}
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">{order.order_number}</p>
            <p className="text-sm">{formatDate(order.created_at)}</p>
          </div>
        </header>

        <section className="border-b-2 border-ink py-4">
          <p className="text-xs font-bold uppercase tracking-wide">Deliver to</p>
          <p className="mt-1 text-2xl font-bold">{order.customer_name}</p>
          <p className="text-xl">
            {formatPhoneForDisplay(order.phone)}
            {order.alt_phone && <span> / {formatPhoneForDisplay(order.alt_phone)}</span>}
          </p>
          <p className="mt-3 text-xs font-bold uppercase tracking-wide">Motor park</p>
          <p className="text-xl font-bold">{order.motor_park}</p>
          <p className="text-xl">
            {order.city}, {order.state}
          </p>
        </section>

        <section className="py-4">
          <p className="text-xs font-bold uppercase tracking-wide">Contents</p>
          <ul className="mt-1 space-y-1">
            {order.order_items.map((item) => {
              const custom = describeCustomisation({ customName: item.custom_name, customNumber: item.custom_number, badgeName: item.badge_name });
              return (
                <li key={item.id} className="text-base">
                  <strong>{item.quantity} ×</strong> {item.product_name} — size {item.size}
                  {custom && <span> ({custom})</span>}
                </li>
              );
            })}
          </ul>
          {order.logistics_name && (
            <p className="mt-3 text-sm">
              Logistics: {order.logistics_name}
              {order.logistics_phone && ` · ${formatPhoneForDisplay(order.logistics_phone)}`}
            </p>
          )}
          {order.dispatch_note && <p className="text-sm">Note: {order.dispatch_note}</p>}
        </section>
      </article>
    </>
  );
}
