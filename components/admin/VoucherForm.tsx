"use client";

import { Plus } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { ActionResult } from "@/lib/admin/action";
import { createVouchers } from "@/lib/admin/actions/vouchers";
import { randomVoucherCode } from "@/lib/admin/voucher-code";
import { cn } from "@/components/ui/cn";
import { formatNaira } from "@/lib/format";
import { parseNaira } from "./NetPriceInput";
import { Checkbox, FormMessage } from "./ui";

const nairaText = (n: number | null) => (n === null ? "" : formatNaira(n).slice(1));

/** Voucher generator. Leave the code empty for random codes (and to make several at once). */
export function VoucherForm({ products }: { products: { id: string; name: string }[] }) {
  const [code, setCode] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [type, setType] = useState<"percent" | "fixed">("fixed");
  const [value, setValue] = useState<number | null>(null);
  const [maxDiscount, setMaxDiscount] = useState<number | null>(null);
  const [minOrder, setMinOrder] = useState<number | null>(null);
  const [maxUses, setMaxUses] = useState(1);
  const [expires, setExpires] = useState("");
  const [note, setNote] = useState("");
  const [restrict, setRestrict] = useState(false);
  const [productIds, setProductIds] = useState<string[]>([]);
  const [result, setResult] = useState<ActionResult<{ codes: string[] }> | null>(null);
  const [pending, startTransition] = useTransition();
  const fields = result && !result.ok ? result.fields : undefined;

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const r = await createVouchers({
            code: code || null,
            quantity: code ? 1 : quantity,
            discount_type: type,
            discount_value: value ?? 0,
            max_discount: maxDiscount,
            min_order_value: minOrder ?? 0,
            max_uses: maxUses,
            product_ids: restrict ? productIds : [],
            expires_at: expires || null,
            note,
          });
          setResult(r);
          if (r.ok) setCode("");
        });
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <div className="flex items-end gap-2">
            <Input
              label="Code"
              className="flex-1"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ""))}
              placeholder="Leave empty for a random code"
              error={fields?.code}
            />
            <Button variant="secondary" onClick={() => setCode(randomVoucherCode())}>
              Random
            </Button>
          </div>
        </div>
        {!code && (
          <Input
            label="How many codes"
            type="number"
            min={1}
            max={50}
            value={String(quantity)}
            onChange={(e) => setQuantity(Math.min(50, Math.max(1, Number.parseInt(e.target.value, 10) || 1)))}
            hint="e.g. 20 single-use gift codes with the same rules."
            error={fields?.quantity}
          />
        )}
      </div>

      <fieldset>
        <legend className="mb-1 text-sm font-medium">Discount</legend>
        <div className="mb-2 inline-flex rounded-full bg-surface-strong p-1 text-sm">
          {(["fixed", "percent"] as const).map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={type === t}
              onClick={() => setType(t)}
              className={cn("min-h-9 rounded-full px-4 font-medium", type === t && "bg-white shadow-sm")}
            >
              {t === "fixed" ? "Naira (₦)" : "Percent (%)"}
            </button>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label={type === "fixed" ? "Amount off (₦)" : "Percent off"}
            inputMode="numeric"
            value={nairaText(value)}
            onChange={(e) => setValue(parseNaira(e.target.value))}
            error={fields?.discount_value}
            required
          />
          {type === "percent" && (
            <Input
              label="Maximum discount (₦, optional)"
              inputMode="numeric"
              value={nairaText(maxDiscount)}
              onChange={(e) => setMaxDiscount(parseNaira(e.target.value))}
              error={fields?.max_discount}
            />
          )}
        </div>
        <p className="mt-1 text-sm text-muted">Comes off the jerseys only, never delivery.</p>
      </fieldset>

      <div className="grid gap-3 sm:grid-cols-3">
        <Input
          label="Minimum order (₦)"
          inputMode="numeric"
          value={nairaText(minOrder)}
          onChange={(e) => setMinOrder(parseNaira(e.target.value))}
          placeholder="0"
          error={fields?.min_order_value}
        />
        <Input
          label="Uses allowed (per code)"
          type="number"
          min={1}
          value={String(maxUses)}
          onChange={(e) => setMaxUses(Math.max(1, Number.parseInt(e.target.value, 10) || 1))}
          hint="1 for gift codes."
          error={fields?.max_uses}
        />
        <Input label="Expires after (optional)" type="date" value={expires} onChange={(e) => setExpires(e.target.value)} error={fields?.expires_at} />
      </div>

      <div>
        <Checkbox label="Only for some jerseys" checked={restrict} onChange={(e) => setRestrict(e.target.checked)} />
        {restrict && (
          <div className="max-h-64 overflow-y-auto rounded-lg border border-line px-3">
            {products.map((p) => (
              <Checkbox
                key={p.id}
                label={p.name}
                checked={productIds.includes(p.id)}
                onChange={() => setProductIds((ids) => (ids.includes(p.id) ? ids.filter((i) => i !== p.id) : [...ids, p.id]))}
              />
            ))}
          </div>
        )}
      </div>

      <Input label="Note (optional, only you see this)" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Influencer: @name" error={fields?.note} />

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" loading={pending}>
          {!pending && <Plus />}
          Create voucher{!code && quantity > 1 ? "s" : ""}
        </Button>
        <FormMessage result={result} />
      </div>
      {result?.ok && result.data && result.data.codes.length > 1 && (
        <textarea readOnly className="h-32 w-full rounded-lg border border-line p-2 font-mono text-sm" value={result.data.codes.join("\n")} aria-label="New codes" />
      )}
    </form>
  );
}
