"use client";

import { useId, useState } from "react";
import { fieldClasses } from "@/components/ui/Input";
import { formatNaira } from "@/lib/format";
import { grossUpAddon, grossUpJersey, PAYSTACK_FEE, paystackFee } from "@/lib/pricing";

/** Digits only → integer naira, or null when empty. Accepts "15,000". */
export function parseNaira(v: string): number | null {
  const digits = v.replace(/[^\d]/g, "");
  return digits ? Number(digits) : null;
}

/**
 * "You receive" → "Customer pays". The owner types what they want to land in the
 * bank; the customer price (fee-inclusive, rounded up to ₦50) fills in. The customer
 * price can still be typed directly to override. Only the customer price is saved.
 *
 * kind "jersey" carries Paystack's ₦100 flat fee; "addon" (badges, name/number,
 * delivery) carries only the 1.5%.
 */
export function NetPriceInput({
  label,
  kind,
  value,
  onChange,
  error,
  optional,
}: {
  label: string;
  kind: "jersey" | "addon";
  value: number | null;
  onChange: (price: number | null) => void;
  error?: string;
  optional?: boolean;
}) {
  const id = useId();
  const [net, setNet] = useState("");
  const grossUp = kind === "jersey" ? grossUpJersey : grossUpAddon;

  const fee = value ? (kind === "jersey" ? paystackFee(value) : value * PAYSTACK_FEE.pct) : 0;

  return (
    <fieldset className="rounded-lg border border-line p-3">
      <legend className="px-1 text-sm font-medium">
        {label}
        {optional && <span className="font-normal text-muted"> (optional)</span>}
      </legend>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor={`${id}-net`} className="mb-1 block text-xs text-muted">
            You want to receive
          </label>
          <input
            id={`${id}-net`}
            inputMode="numeric"
            className={fieldClasses}
            placeholder="₦"
            value={net}
            onChange={(e) => {
              const n = parseNaira(e.target.value);
              setNet(n === null ? "" : formatNaira(n).slice(1));
              onChange(n === null ? (optional ? null : value) : grossUp(n));
            }}
          />
        </div>
        <div>
          <label htmlFor={`${id}-price`} className="mb-1 block text-xs text-muted">
            Customer pays
          </label>
          <input
            id={`${id}-price`}
            inputMode="numeric"
            className={fieldClasses}
            placeholder="₦"
            aria-invalid={error ? true : undefined}
            value={value === null ? "" : formatNaira(value).slice(1)}
            onChange={(e) => {
              setNet("");
              onChange(parseNaira(e.target.value));
            }}
          />
        </div>
      </div>
      {value ? (
        <p className="mt-2 text-xs text-muted">
          Paystack takes about {formatNaira(fee)}, you receive about {formatNaira(value - fee)}
          {kind === "jersey" ? " (for a one-jersey order)" : ""}.
        </p>
      ) : null}
      {error && <p className="mt-1 text-sm text-brand">{error}</p>}
    </fieldset>
  );
}
