"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Button, buttonClasses } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Spinner } from "@/components/ui/Spinner";
import { useCartHydrated } from "@/hooks/useCartHydrated";
import { useCartQuote } from "@/hooks/useCartQuote";
import { formatNaira } from "@/lib/format";
import { toApiLines, useCart } from "@/store/cart";
import { OrderSummary } from "./OrderSummary";
import { VoucherInput } from "./VoucherInput";

type Provider = { id: "paystack" | "crypto"; label: string };

const DELIVERY_COPY =
  "We send your order to the motor park you choose. The logistics company will call the phone number you give us when it arrives. Bring your order number and a valid ID to pick it up.";

export function CheckoutForm({
  states,
  providers,
  storeOpen,
}: {
  states: readonly string[];
  providers: Provider[];
  storeOpen: boolean;
}) {
  const hydrated = useCartHydrated();
  const items = useCart((s) => s.items);
  const [state, setState] = useState("");
  const [voucherCode, setVoucherCode] = useState<string>();
  const [provider, setProvider] = useState<Provider["id"]>(providers[0]?.id ?? "paystack");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const { quote, loading, error: quoteError } = useCartQuote({ items, state, voucherCode, enabled: hydrated });

  if (!hydrated) {
    return (
      <div className="flex justify-center py-16">
        <Spinner label="Loading your cart" />
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-lg font-bold">Your cart is empty</p>
        <Link href="/catalogue" className={buttonClasses({ className: "mt-6" })}>
          Shop jerseys
        </Link>
      </div>
    );
  }

  const hasProblems = (quote?.problems.length ?? 0) > 0;
  const canPay = storeOpen && providers.length > 0 && !!quote && !hasProblems && !submitting;
  const total = quote?.delivery ? quote.total : null;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canPay) return;
    const f = new FormData(e.currentTarget);
    const text = (name: string) => String(f.get(name) ?? "");
    setSubmitting(true);
    setErrors({});
    setFormError(null);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lines: toApiLines(items),
          voucherCode,
          provider,
          customer: {
            name: text("name"),
            phone: text("phone"),
            altPhone: text("altPhone"),
            email: text("email"),
            state,
            city: text("city"),
            motorPark: text("motorPark"),
            notes: text("notes"),
            newsletter: f.get("newsletter") === "on",
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const fields: Record<string, string> = {};
        for (const [k, v] of Object.entries((data.fields ?? {}) as Record<string, string>)) {
          fields[k.replace(/^customer\./, "")] = v;
        }
        setErrors(fields);
        setFormError(
          data.problems ? "Some items in your cart need attention. Go back to your cart to fix them." : data.error,
        );
        const first = Object.keys(fields)[0];
        if (first) document.getElementsByName(first)[0]?.focus();
        else window.scrollTo({ top: 0 });
        setSubmitting(false);
        return;
      }
      // Off to Paystack. Keep the button disabled so a double tap can't create a second order.
      window.location.assign(data.redirectUrl);
    } catch {
      setFormError("We couldn't reach the server. Check your connection and try again.");
      setSubmitting(false);
    }
  }

  const summary = <OrderSummary items={items} quote={quote} loading={loading} />;

  return (
    <div className="lg:grid lg:grid-cols-[1fr_24rem] lg:items-start lg:gap-12">
      {/* Mobile: collapsible summary above the form */}
      <details className="group mb-6 rounded-2xl bg-surface lg:hidden">
        <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between px-4 font-medium">
          <span className="flex items-center gap-2">
            <svg viewBox="0 0 24 24" className="size-4 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="group-open:hidden">Show order summary</span>
            <span className="hidden group-open:inline">Hide order summary</span>
          </span>
          <span className="font-bold">{quote ? formatNaira(quote.total) : "…"}</span>
        </summary>
        <div className="px-4 pb-4">{summary}</div>
      </details>

      <form onSubmit={onSubmit} noValidate className="space-y-8">
        {!storeOpen && (
          <p role="alert" className="rounded-2xl bg-surface-strong p-4">
            We&apos;re not taking orders right now. You can still browse — please check back soon.
          </p>
        )}
        {formError && (
          <div role="alert" className="rounded-2xl border border-brand bg-red-50 p-4 text-sm text-brand">
            {formError}{" "}
            {hasProblems && (
              <Link href="/cart" className="font-medium underline underline-offset-4">
                Go to cart
              </Link>
            )}
          </div>
        )}

        <fieldset className="space-y-4">
          <legend className="mb-2 text-lg font-bold">Your details</legend>
          <Input label="Full name" name="name" autoComplete="name" required error={errors.name} />
          <Input
            label="Phone number"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="0803 123 4567"
            required
            hint="The logistics company will call this number."
            error={errors.phone}
          />
          <Input
            label="Alternative phone (optional)"
            name="altPhone"
            type="tel"
            inputMode="tel"
            placeholder="0703 123 4567"
            hint="In case we can't reach you on the first number."
            error={errors.altPhone}
          />
          <Input
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            required
            hint="Your receipt and order updates go here."
            error={errors.email}
          />
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="mb-1 text-lg font-bold">Delivery</legend>
          <p className="text-sm text-muted">{DELIVERY_COPY}</p>
          <div>
            <Select
              label="State"
              name="state"
              value={state}
              onChange={(e) => setState(e.target.value)}
              placeholder="Choose your state"
              options={states}
              required
              error={errors.state}
            />
            {quote?.delivery && (
              <p className="mt-1 text-sm" aria-live="polite">
                Delivery to {state} (Zone {quote.delivery.zone}): <strong>{formatNaira(quote.delivery.fee)}</strong>
              </p>
            )}
          </div>
          <Input label="City / LGA" name="city" autoComplete="address-level2" required error={errors.city} />
          <Input
            label="Nearest motor park"
            name="motorPark"
            required
            placeholder="e.g. Ojota Motor Park"
            hint="This goes on the waybill."
            error={errors.motorPark}
          />
          <div>
            <label htmlFor="notes" className="mb-1 block text-sm font-medium">
              Order notes (optional)
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              maxLength={500}
              className="block w-full rounded-lg border border-line bg-white px-3 py-2 text-base focus:border-ink focus:outline-none focus-visible:outline-2"
            />
            {errors.notes && <p className="mt-1 text-sm text-brand">{errors.notes}</p>}
          </div>
        </fieldset>

        <VoucherInput items={items} state={state} applied={voucherCode} onApply={setVoucherCode} quote={quote} />

        <label className="flex cursor-pointer items-start gap-3">
          <input type="checkbox" name="newsletter" className="mt-0.5 size-5 shrink-0 accent-brand" />
          <span className="text-sm">Send me Amioprowears deals and new drops</span>
        </label>

        {providers.length > 1 && (
          <fieldset>
            <legend className="mb-2 text-lg font-bold">Payment method</legend>
            <div className="space-y-2">
              {providers.map((p) => (
                <label
                  key={p.id}
                  className={cn(
                    "flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border px-3",
                    provider === p.id ? "border-ink ring-1 ring-ink" : "border-line",
                  )}
                >
                  <input
                    type="radio"
                    name="provider"
                    checked={provider === p.id}
                    onChange={() => setProvider(p.id)}
                    className="size-5 accent-brand"
                  />
                  <span className="text-sm font-medium">{p.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
        )}

        {quoteError && (
          <p role="alert" className="text-sm text-brand">
            {quoteError}
          </p>
        )}

        <div className="space-y-2">
          <Button type="submit" size="lg" className="w-full" loading={submitting} disabled={!canPay}>
            {total !== null ? `Pay ${formatNaira(total)}` : "Pay"}
          </Button>
          <p className="text-center text-xs text-muted">
            {provider === "paystack"
              ? "Card, bank transfer or USSD — you'll pay securely on Paystack's page."
              : "You'll pay on the payment provider's page."}
          </p>
        </div>
      </form>

      <aside className="hidden lg:sticky lg:top-24 lg:block lg:rounded-2xl lg:bg-surface lg:p-6" aria-label="Order summary">
        <h2 className="mb-4 text-lg font-bold">Order summary</h2>
        {summary}
      </aside>
    </div>
  );
}
