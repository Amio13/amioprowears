"use client";

import { Check, ClipboardCheck, PackageCheck, Search, Shirt, Truck, type LucideIcon } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { Input } from "@/components/ui/Input";
import { describeCustomisation } from "@/lib/customizer";
import type { OrderStatus, PaymentStatus } from "@/types";

interface TrackedOrder {
  order_number: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  created_at: string;
  order_items: {
    product_name: string;
    size: string;
    custom_name: string | null;
    custom_number: string | null;
    badge_name: string | null;
    quantity: number;
  }[];
}

const STEPS: { status: OrderStatus; label: string; detail: string; icon: LucideIcon }[] = [
  { status: "pending", label: "Order received", detail: "We've got your order.", icon: ClipboardCheck },
  { status: "processing", label: "Being made", detail: "Your jersey is being prepared and printed.", icon: Shirt },
  { status: "dispatched", label: "On its way", detail: "Sent to your motor park. The logistics company will call you.", icon: Truck },
  { status: "delivered", label: "Collected", detail: "Enjoy your jersey!", icon: PackageCheck },
];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const formatDate = (iso: string) => {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

/** Order number + phone → status and items. No personal data comes back from the API. */
export function TrackOrder() {
  const initialOrder = useSearchParams().get("order") ?? "";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [order, setOrder] = useState<TrackedOrder | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setLoading(true);
    setError(null);
    setFields({});
    try {
      const res = await fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber: f.get("orderNumber"), phone: f.get("phone") }),
      });
      const data = await res.json();
      if (!res.ok) {
        setOrder(null);
        setFields(data.fields ?? {});
        setError(data.fields ? null : data.error);
        return;
      }
      setOrder(data as TrackedOrder);
    } catch {
      setError("We couldn't reach the server. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  const current = order ? STEPS.findIndex((s) => s.status === order.status) : -1;

  return (
    <>
      <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4">
        <Input
          label="Order number"
          name="orderNumber"
          defaultValue={initialOrder}
          placeholder="APW-1047"
          autoCapitalize="characters"
          autoComplete="off"
          required
          error={fields.orderNumber}
        />
        <Input
          label="Phone number"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="0803 123 4567"
          required
          error={fields.phone}
        />
        <Button type="submit" size="lg" loading={loading} className="w-full sm:w-auto">
          {!loading && <Search />}
          Track order
        </Button>
        {error && (
          <p role="alert" className="text-sm text-brand">
            {error}
          </p>
        )}
      </form>

      {order && (
        <section aria-live="polite" className="mt-10 space-y-6">
          <div>
            <h2 className="text-2xl font-bold">{order.order_number}</h2>
            <p className="text-sm text-muted">Placed {formatDate(order.created_at)}</p>
          </div>

          {order.payment_status !== "paid" ? (
            <p className="rounded-2xl bg-surface-strong p-4">
              {order.payment_status === "refunded"
                ? "This order was refunded."
                : "We haven't received payment for this order yet, so it isn't being processed."}
            </p>
          ) : order.status === "cancelled" ? (
            <p className="rounded-2xl bg-surface-strong p-4">This order was cancelled. Contact us if you have questions.</p>
          ) : (
            <ol className="space-y-4">
              {STEPS.map((step, i) => (
                <li key={step.status} className="flex gap-3">
                  <span
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-full",
                      i <= current ? "bg-brand text-white" : "bg-surface-strong text-muted",
                    )}
                    aria-hidden="true"
                  >
                    {i < current ? <Check className="size-5" strokeWidth={3} /> : <step.icon className="size-5" />}
                  </span>
                  <div className="pt-1.5">
                    <p className={cn("font-medium", i > current && "text-muted")}>
                      {step.label}
                      {i === current && <span className="sr-only"> (current step)</span>}
                    </p>
                    {i === current && <p className="text-sm text-muted">{step.detail}</p>}
                  </div>
                </li>
              ))}
            </ol>
          )}

          <div>
            <h3 className="mb-2 font-bold">Items</h3>
            <ul className="divide-y divide-line rounded-2xl bg-surface px-4">
              {order.order_items.map((item, i) => {
                const custom = describeCustomisation({
                  customName: item.custom_name,
                  customNumber: item.custom_number,
                  badgeName: item.badge_name,
                });
                return (
                  <li key={i} className="py-3 text-sm">
                    <p className="font-medium">{item.product_name}</p>
                    <p className="text-muted">
                      Size {item.size} · Qty {item.quantity}
                      {custom && ` · ${custom}`}
                    </p>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      )}
    </>
  );
}
