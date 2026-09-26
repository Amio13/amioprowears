"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type { ActionResult } from "@/lib/admin/action";
import { updateOrder } from "@/lib/admin/actions/orders";
import { ORDER_STATUS } from "@/lib/admin/labels";
import { ORDER_STATUSES } from "@/lib/admin/schemas";
import { formatPhoneForDisplay } from "@/lib/format";
import { CUSTOMER_STATUSES } from "@/lib/notify/templates";
import type { Order, OrderStatus } from "@/types";
import { Checkbox, FormMessage, Textarea } from "./ui";

type Props = Pick<Order, "id" | "status" | "payment_status" | "logistics_name" | "logistics_phone" | "dispatch_note">;

const HINTS: Partial<Record<OrderStatus, string>> = {
  processing: "You're preparing (printing/packing) the order.",
  dispatched: "Add the logistics company and waybill details so the customer knows who will call.",
  delivered: "The customer has picked it up.",
  cancelled: "The note below is included in the cancellation email.",
};

export function OrderStatusForm({ order }: { order: Props }) {
  const [status, setStatus] = useState<OrderStatus>(order.status);
  const [name, setName] = useState(order.logistics_name ?? "");
  const [phone, setPhone] = useState(order.logistics_phone ? formatPhoneForDisplay(order.logistics_phone) : "");
  const [note, setNote] = useState(order.dispatch_note ?? "");
  const [email, setEmail] = useState(false);
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, startTransition] = useTransition();

  const canEmail = (CUSTOMER_STATUSES as readonly string[]).includes(status);
  const fields = result && !result.ok ? result.fields : undefined;

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const r = await updateOrder({
            orderId: order.id,
            status,
            logistics_name: name,
            logistics_phone: phone,
            dispatch_note: note,
            emailCustomer: canEmail && email,
          });
          setResult(r);
          if (r.ok) setEmail(false);
        });
      }}
    >
      <Select
        label="Status"
        value={status}
        onChange={(e) => {
          const next = e.target.value as OrderStatus;
          setStatus(next);
          // Suggest emailing when moving to a new customer-facing status.
          setEmail(next !== order.status && (CUSTOMER_STATUSES as readonly string[]).includes(next));
          setResult(null);
        }}
        options={ORDER_STATUSES.map((s) => ({ value: s, label: ORDER_STATUS[s].label }))}
      />
      {HINTS[status] && <p className="text-sm text-muted">{HINTS[status]}</p>}
      {status !== "pending" && order.payment_status !== "paid" && status !== "cancelled" && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">This order isn&apos;t paid. Check before sending anything.</p>
      )}
      {status === "cancelled" && order.payment_status === "paid" && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          Refund the customer in Paystack (Transactions → open the payment → Refund), then press &quot;Mark as refunded&quot; below.
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Logistics company" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. GIG Logistics" error={fields?.logistics_name} />
        <Input
          label="Logistics phone"
          type="tel"
          inputMode="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="0803 123 4567"
          error={fields?.logistics_phone}
        />
      </div>
      <Textarea label="Note for the customer" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Waybill number 12345" error={fields?.dispatch_note} rows={2} />
      {canEmail && (
        <Checkbox
          label={`Email the customer that the order is ${ORDER_STATUS[status].label.toLowerCase()}`}
          checked={email}
          onChange={(e) => setEmail(e.target.checked)}
        />
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" loading={pending}>
          Save
        </Button>
        <FormMessage result={result} />
      </div>
    </form>
  );
}
