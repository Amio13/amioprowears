"use client";

import { Tag, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { fieldClasses } from "@/components/ui/Input";
import { formatNaira } from "@/lib/format";
import type { OrderQuote } from "@/lib/order-pricing";
import { toApiLines, type CartItem } from "@/store/cart";

/**
 * Voucher code + Apply. Checked with /api/vouchers/validate; only a valid code is
 * applied (and re-checked by the server at checkout). Nothing is used up until payment.
 */
export function VoucherInput({
  items,
  state,
  applied,
  onApply,
  quote,
}: {
  items: CartItem[];
  state: string;
  applied?: string;
  onApply: (code: string | undefined) => void;
  quote: OrderQuote | null;
}) {
  const [code, setCode] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A code can stop applying later (e.g. items removed below the minimum) — show why.
  const lateError = applied && quote?.voucher && !quote.voucher.ok ? quote.voucher.error : null;

  async function apply() {
    if (!code.trim()) return setError("Enter a voucher code.");
    setChecking(true);
    setError(null);
    try {
      const res = await fetch("/api/vouchers/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lines: toApiLines(items), state: state || undefined, voucherCode: code }),
      });
      const data = await res.json();
      if (data.ok) {
        onApply(data.quote.voucher.code);
        setCode("");
      } else {
        setError(data.error ?? "That voucher code isn't valid.");
      }
    } catch {
      setError("We couldn't check that code. Check your connection and try again.");
    } finally {
      setChecking(false);
    }
  }

  if (applied) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border border-line p-3">
        <div className="text-sm">
          <p className="flex items-center gap-1.5 font-medium">
            <Tag className="size-4 shrink-0" />
            Voucher {applied}
          </p>
          {quote?.voucher?.ok ? (
            <p className="text-green-700">−{formatNaira(quote.discount)} off your jerseys</p>
          ) : lateError ? (
            <p role="alert" className="text-brand">{lateError}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => onApply(undefined)}
          className="inline-flex min-h-11 items-center gap-1 px-2 text-sm hover:text-brand"
        >
          <X className="size-4" />
          Remove
        </button>
      </div>
    );
  }

  return (
    <div>
      <label htmlFor="voucher" className="mb-1 block text-sm font-medium">
        Voucher code (optional)
      </label>
      <div className="flex gap-2">
        <input
          id="voucher"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault(); // don't submit the whole checkout form
              void apply();
            }
          }}
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          placeholder="APW-XXXX"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "voucher-error" : undefined}
          className={fieldClasses}
        />
        <Button variant="secondary" onClick={apply} loading={checking} className="shrink-0">
          {!checking && <Tag />}
          Apply
        </Button>
      </div>
      {error && (
        <p id="voucher-error" role="alert" className="mt-1 text-sm text-brand">
          {error}
        </p>
      )}
    </div>
  );
}
