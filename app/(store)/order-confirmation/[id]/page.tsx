import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ClearCartOnPaid } from "@/components/checkout/ClearCartOnPaid";
import { PaymentPending } from "@/components/checkout/PaymentPending";
import { buttonClasses } from "@/components/ui/Button";
import { describeCustomisation } from "@/lib/customizer";
import { formatNaira } from "@/lib/format";
import { markPaymentSuccessful } from "@/lib/payments/confirm-db";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Your order", robots: { index: false, follow: false } };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface ConfirmationOrder {
  id: string;
  order_number: string;
  customer_name: string;
  state: string;
  city: string;
  motor_park: string;
  delivery_zone: string;
  delivery_fee: number;
  subtotal: number;
  discount: number;
  total: number;
  voucher_code: string | null;
  payment_status: "unpaid" | "paid" | "failed" | "amount_mismatch" | "refunded";
  order_items: {
    product_name: string;
    size: string;
    custom_name: string | null;
    custom_number: string | null;
    badge_name: string | null;
    quantity: number;
    item_total: number;
  }[];
  payments: { reference: string; created_at: string }[];
}

async function loadOrder(id: string) {
  const { data, error } = await createAdminClient()
    .from("orders")
    .select(
      "id, order_number, customer_name, state, city, motor_park, delivery_zone, delivery_fee, " +
        "subtotal, discount, total, voucher_code, payment_status, " +
        "order_items(product_name, size, custom_name, custom_number, badge_name, quantity, item_total), " +
        "payments(reference, created_at)",
    )
    .eq("id", id)
    .maybeSingle<ConfirmationOrder>();
  if (error) throw new Error(`Loading order failed: ${error.message}`);
  return data;
}

/**
 * Where Paystack sends the customer back (?reference=…). The order id is an
 * unguessable UUID. We verify the payment here with the same idempotent function
 * the webhook uses, then show the result.
 */
export default async function OrderConfirmationPage({
  params,
  searchParams,
}: PageProps<"/order-confirmation/[id]">) {
  await connection();
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const sp = await searchParams;
  const fromUrl = [sp.reference, sp.trxref].flat().find((v): v is string => typeof v === "string");

  let order = await loadOrder(id);
  if (!order) notFound();

  // Only trust a reference that belongs to THIS order; otherwise use its latest payment.
  const latest = [...order.payments].sort((a, b) => b.created_at.localeCompare(a.created_at))[0]?.reference;
  const reference = order.payments.some((p) => p.reference === fromUrl) ? fromUrl : latest;

  let status: string = order.payment_status;
  if (reference && order.payment_status !== "paid") {
    try {
      status = (await markPaymentSuccessful(reference)).status;
    } catch (err) {
      console.error(`Confirming ${order.order_number} failed`, err);
      status = "pending";
    }
    order = (await loadOrder(id)) ?? order;
  }
  if (order.payment_status === "paid") status = "paid";

  const firstName = order.customer_name.split(" ")[0];
  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:py-12">
      {status === "paid" ? (
        <>
          <ClearCartOnPaid orderId={order.id} />
          <p className="font-display text-2xl tracking-wide text-brand">Payment received</p>
          <h1 className="font-display text-5xl leading-none tracking-wide">Thank you, {firstName}!</h1>
          <p className="mt-3 text-lg">
            Your order number is <strong>{order.order_number}</strong>. Keep it — you&apos;ll need it to track and
            collect your order.
          </p>
        </>
      ) : status === "pending" ? (
        <>
          <h1 className="font-display text-5xl leading-none tracking-wide">Confirming your payment</h1>
          <p className="mt-3">Order {order.order_number}. This usually takes a few seconds.</p>
          <div className="mt-4">{reference && <PaymentPending reference={reference} />}</div>
        </>
      ) : status === "amount_mismatch" ? (
        <>
          <h1 className="font-display text-5xl leading-none tracking-wide">We&apos;re checking your payment</h1>
          <p className="mt-3">
            The amount we received for order {order.order_number} doesn&apos;t match the order total. We&apos;ll contact
            you to sort it out{supportEmail ? <> — or email <a className="underline" href={`mailto:${supportEmail}`}>{supportEmail}</a></> : null}.
          </p>
        </>
      ) : (
        <>
          <h1 className="font-display text-5xl leading-none tracking-wide">Payment not completed</h1>
          <p className="mt-3">
            Order {order.order_number} hasn&apos;t been paid, so it won&apos;t be processed. Your cart is still saved — you
            can try again.
          </p>
          <Link href="/checkout" className={buttonClasses({ size: "lg", className: "mt-6" })}>
            Back to checkout
          </Link>
        </>
      )}

      <section aria-labelledby="items-heading" className="mt-10 rounded-2xl bg-surface p-4 sm:p-6">
        <h2 id="items-heading" className="mb-2 text-lg font-bold">
          Order {order.order_number}
        </h2>
        <ul className="divide-y divide-line">
          {order.order_items.map((item, i) => {
            const custom = describeCustomisation({
              customName: item.custom_name,
              customNumber: item.custom_number,
              badgeName: item.badge_name,
            });
            return (
              <li key={i} className="flex justify-between gap-4 py-3 text-sm">
                <div>
                  <p className="font-medium">{item.product_name}</p>
                  <p className="text-muted">
                    Size {item.size} · Qty {item.quantity}
                    {custom && ` · ${custom}`}
                  </p>
                </div>
                <p className="shrink-0 font-medium">{formatNaira(item.item_total)}</p>
              </li>
            );
          })}
        </ul>
        <dl className="mt-2 space-y-1 border-t border-line pt-3 text-sm">
          <Row term="Subtotal" value={formatNaira(order.subtotal)} />
          <Row term={`Delivery (Zone ${order.delivery_zone})`} value={formatNaira(order.delivery_fee)} />
          {order.discount > 0 && <Row term={`Voucher ${order.voucher_code ?? ""}`} value={`-${formatNaira(order.discount)}`} />}
          <div className="flex justify-between pt-2 text-base font-bold">
            <dt>{status === "paid" ? "Total paid" : "Total"}</dt>
            <dd>{formatNaira(order.total)}</dd>
          </div>
        </dl>
      </section>

      {status === "paid" && (
        <section aria-labelledby="pickup-heading" className="mt-6 space-y-3">
          <h2 id="pickup-heading" className="text-lg font-bold">
            Picking up your order
          </h2>
          <p>
            We&apos;ll send it to <strong>{order.motor_park}</strong>, {order.city}, {order.state}. The logistics company
            will call the phone number you gave us when it arrives. Bring your order number (
            <strong>{order.order_number}</strong>) and a valid ID to pick it up.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link href={`/track?order=${order.order_number}`} className={buttonClasses({ variant: "secondary" })}>
              Track your order
            </Link>
            <Link href="/catalogue" className={buttonClasses({ variant: "ghost" })}>
              Keep shopping
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}

function Row({ term, value }: { term: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt>{term}</dt>
      <dd>{value}</dd>
    </div>
  );
}
