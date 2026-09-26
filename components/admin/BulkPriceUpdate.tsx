"use client";

import { Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { fieldClasses } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type { ActionResult } from "@/lib/admin/action";
import { bulkUpdatePrices } from "@/lib/admin/actions/products";
import { planBulkChange, type BulkPriceOp } from "@/lib/admin/bulk-price";
import { COLLECTION_LABELS, GENDER_LABELS, productCollections } from "@/lib/catalogue";
import { formatNaira } from "@/lib/format";
import type { Product } from "@/types";
import { parseNaira } from "./NetPriceInput";
import { Card, Checkbox, FormMessage } from "./ui";

export type BulkProduct = Pick<Product, "id" | "name" | "club" | "collections" | "gender" | "era" | "price" | "sale_price" | "is_active">;

const MODES = [
  { value: "amount+", label: "Increase by ₦" },
  { value: "amount-", label: "Decrease by ₦" },
  { value: "percent+", label: "Increase by %" },
  { value: "percent-", label: "Decrease by %" },
  { value: "set-net", label: "Set “you receive” to ₦" },
] as const;
type Mode = (typeof MODES)[number]["value"];

function toOp(mode: Mode, value: number): BulkPriceOp | null {
  if (!value) return null;
  switch (mode) {
    case "amount+":
      return { kind: "amount", amount: value };
    case "amount-":
      return { kind: "amount", amount: -value };
    case "percent+":
      return { kind: "percent", percent: value };
    case "percent-":
      return { kind: "percent", percent: -value };
    case "set-net":
      return { kind: "set-net", net: value };
  }
}

export function BulkPriceUpdate({ products }: { products: BulkProduct[] }) {
  const router = useRouter();
  const [collection, setCollection] = useState("");
  const [club, setClub] = useState("");
  const [gender, setGender] = useState("");
  const [includeHidden, setIncludeHidden] = useState(false);
  const [mode, setMode] = useState<Mode>("amount+");
  const [raw, setRaw] = useState("");
  const [alsoSale, setAlsoSale] = useState(true);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<ActionResult<unknown> | null>(null);
  const [pending, startTransition] = useTransition();

  const clubs = useMemo(() => [...new Set(products.map((p) => p.club))].sort(), [products]);
  const matching = products.filter(
    (p) =>
      (includeHidden || p.is_active) &&
      (!collection || (productCollections(p) as string[]).includes(collection)) &&
      (!club || p.club === club) &&
      (!gender || p.gender === gender),
  );
  const isPercent = mode.startsWith("percent");
  const value = isPercent ? Number(raw.replace(/[^\d.]/g, "")) || 0 : (parseNaira(raw) ?? 0);
  const op = toOp(mode, value);
  const chosen = matching.filter((p) => !excluded.has(p.id));

  return (
    <div className="space-y-4">
      <Card title="1. Choose jerseys">
        <div className="grid gap-3 sm:grid-cols-3">
          <Select label="Collection" value={collection} onChange={(e) => setCollection(e.target.value)} placeholder="All collections" options={Object.entries(COLLECTION_LABELS).map(([value, label]) => ({ value, label }))} />
          <Select label="Club" value={club} onChange={(e) => setClub(e.target.value)} placeholder="All clubs" options={clubs} />
          <Select label="For" value={gender} onChange={(e) => setGender(e.target.value)} placeholder="Everyone" options={Object.entries(GENDER_LABELS).map(([value, label]) => ({ value, label }))} />
        </div>
        <Checkbox label="Include hidden jerseys" checked={includeHidden} onChange={(e) => setIncludeHidden(e.target.checked)} />
      </Card>

      <Card title="2. Change">
        <div className="grid gap-3 sm:grid-cols-[1fr_12rem]">
          <Select label="Change" value={mode} onChange={(e) => setMode(e.target.value as Mode)} options={MODES} />
          <label className="block text-sm font-medium">
            {isPercent ? "Percent" : "Amount (₦)"}
            <input inputMode="decimal" className={`${fieldClasses} mt-1`} value={raw} onChange={(e) => setRaw(e.target.value)} placeholder={isPercent ? "10" : "1,000"} />
          </label>
        </div>
        <p className="mt-2 text-sm text-muted">
          New prices are rounded up to the nearest ₦50.
          {mode === "set-net" && " The customer price is worked out so you receive this amount after Paystack's fee."}
        </p>
        {mode !== "set-net" && <Checkbox label="Also change sale prices" checked={alsoSale} onChange={(e) => setAlsoSale(e.target.checked)} />}
      </Card>

      <Card title={`3. Check (${chosen.length} of ${matching.length} selected)`}>
        {matching.length === 0 ? (
          <p className="text-sm text-muted">No jerseys match.</p>
        ) : (
          <ul className="divide-y divide-line">
            {matching.map((p) => {
              const next = op ? planBulkChange(p, op, alsoSale) : null;
              return (
                <li key={p.id}>
                  <label className="flex min-h-11 cursor-pointer items-center gap-3 py-2 text-sm">
                    <input
                      type="checkbox"
                      className="size-5 accent-[var(--color-brand)]"
                      checked={!excluded.has(p.id)}
                      onChange={() =>
                        setExcluded((s) => {
                          const n = new Set(s);
                          if (n.has(p.id)) n.delete(p.id);
                          else n.add(p.id);
                          return n;
                        })
                      }
                    />
                    <span className="min-w-0 flex-1 truncate">{p.name}</span>
                    <span className="whitespace-nowrap text-right tabular-nums">
                      {formatNaira(p.price)}
                      {next && <strong> → {formatNaira(next.price)}</strong>}
                      {p.sale_price !== null && (
                        <span className="block text-xs text-muted">
                          Sale {formatNaira(p.sale_price)}
                          {next && (next.sale_price === null ? " → removed" : next.sale_price !== p.sale_price ? ` → ${formatNaira(next.sale_price)}` : "")}
                        </span>
                      )}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          size="lg"
          loading={pending}
          disabled={!op || chosen.length === 0}
          onClick={() => {
            if (!op || !window.confirm(`Update the price of ${chosen.length} jersey${chosen.length === 1 ? "" : "s"}?`)) return;
            startTransition(async () => {
              const r = await bulkUpdatePrices({ productIds: chosen.map((p) => p.id), op, alsoSale });
              setResult(r);
              if (r.ok) {
                setRaw("");
                router.refresh();
              }
            });
          }}
        >
          {!pending && <Save />}
          Update {chosen.length} price{chosen.length === 1 ? "" : "s"}
        </Button>
        <FormMessage result={result} />
      </div>
    </div>
  );
}
