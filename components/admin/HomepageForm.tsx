"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type { ActionResult } from "@/lib/admin/action";
import { saveHomepage } from "@/lib/admin/actions/homepage";
import { COLLECTION_LABELS } from "@/lib/catalogue";
import { ALL_COLLECTIONS, HERO_SLOTS, type HeroTile, type HomepageConfig } from "@/lib/homepage";
import type { CollectionSlug, Product } from "@/types";
import { Card, Checkbox, FormMessage, Textarea } from "./ui";

export type HomepageProduct = Pick<Product, "id" | "name" | "image_front" | "image_back">;

type Slot = { productId: string; side: "front" | "back" }; // productId "" = automatic

export function HomepageForm({ config, products }: { config: HomepageConfig; products: HomepageProduct[] }) {
  const [headline, setHeadline] = useState(config.headline);
  const [subtext, setSubtext] = useState(config.subtext);
  const [slots, setSlots] = useState<Slot[]>(() =>
    Array.from({ length: HERO_SLOTS }, (_, i) => config.hero[i] ?? { productId: "", side: i === 1 ? "back" : "front" }),
  );
  // Every collection, shown ones first in the owner's order, then the hidden ones.
  const [rows, setRows] = useState(() => [
    ...config.rows.map((slug) => ({ slug, on: true })),
    ...ALL_COLLECTIONS.filter((c) => !config.rows.includes(c)).map((slug) => ({ slug, on: false })),
  ]);
  const [showSteps, setShowSteps] = useState(config.showSteps);
  const [steps, setSteps] = useState(config.steps);
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, startTransition] = useTransition();
  const fields = result && !result.ok ? result.fields : undefined;

  const byId = new Map(products.map((p) => [p.id, p]));
  const setSlot = (i: number, s: Partial<Slot>) => setSlots((all) => all.map((x, j) => (j === i ? { ...x, ...s } : x)));
  const move = (i: number, by: -1 | 1) =>
    setRows((r) => {
      const next = [...r];
      [next[i], next[i + by]] = [next[i + by]!, next[i]!];
      return next;
    });

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const hero: HeroTile[] = slots.filter((s) => s.productId);
        startTransition(async () =>
          setResult(await saveHomepage({ headline, subtext, hero, rows: rows.filter((r) => r.on).map((r) => r.slug as CollectionSlug), showSteps, steps })),
        );
      }}
    >
      <Card title="Top of the page">
        <Textarea
          label="Headline"
          value={headline}
          onChange={(e) => setHeadline(e.target.value)}
          rows={4}
          hint="Press Enter for a new line (up to 4). The last line shows in red."
          error={fields?.headline}
        />
        <Textarea label="Text under the headline" className="mt-3" value={subtext} onChange={(e) => setSubtext(e.target.value)} rows={3} error={fields?.subtext} />
      </Card>

      <Card title="Top pictures">
        <p className="mb-3 text-sm text-muted">
          Choose the 3 jerseys shown at the top. Slots left on &quot;Automatic&quot; are filled with featured jerseys. Only jerseys that are shown in the store can be picked.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          {slots.map((slot, i) => {
            const p = byId.get(slot.productId);
            const src = p ? (slot.side === "back" && p.image_back) || p.image_front : null;
            return (
              <div key={i} className="space-y-2">
                <Select
                  label={`Picture ${i + 1}`}
                  value={slot.productId}
                  onChange={(e) => setSlot(i, { productId: e.target.value })}
                  options={[{ value: "", label: "Automatic" }, ...products.map((x) => ({ value: x.id, label: x.name }))]}
                />
                <div className="inline-flex rounded-full bg-surface-strong p-1 text-sm">
                  {(["front", "back"] as const).map((side) => (
                    <button
                      key={side}
                      type="button"
                      aria-pressed={slot.side === side}
                      disabled={!p || (side === "back" && !p.image_back)}
                      onClick={() => setSlot(i, { side })}
                      className={cn("min-h-9 rounded-full px-4 font-medium disabled:opacity-40", slot.side === side && p && "bg-white shadow-sm")}
                    >
                      {side === "front" ? "Front" : "Back"}
                    </button>
                  ))}
                </div>
                <div className="relative aspect-[4/5] w-full max-w-40 overflow-hidden rounded-lg bg-surface">
                  {src ? (
                    <Image src={src} alt="" fill sizes="160px" className="object-cover" unoptimized />
                  ) : (
                    <span className="absolute inset-0 flex items-center justify-center p-2 text-center text-xs text-muted">Automatic</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card title="Collection rows">
        <p className="mb-2 text-sm text-muted">Tick the rows to show and use the arrows to change the order. Empty collections are skipped.</p>
        <ul className="divide-y divide-line">
          {rows.map((r, i) => (
            <li key={r.slug} className="flex items-center gap-2">
              <Checkbox
                className="flex-1"
                label={COLLECTION_LABELS[r.slug]}
                checked={r.on}
                onChange={(e) => setRows((all) => all.map((x) => (x.slug === r.slug ? { ...x, on: e.target.checked } : x)))}
              />
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="size-11 rounded-full hover:bg-surface-strong disabled:opacity-30" aria-label={`Move ${COLLECTION_LABELS[r.slug]} up`}>
                ↑
              </button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === rows.length - 1} className="size-11 rounded-full hover:bg-surface-strong disabled:opacity-30" aria-label={`Move ${COLLECTION_LABELS[r.slug]} down`}>
                ↓
              </button>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="How it works">
        <Checkbox label="Show the “How it works” section" checked={showSteps} onChange={(e) => setShowSteps(e.target.checked)} />
        {showSteps && (
          <div className="mt-2 grid gap-4 md:grid-cols-3">
            {steps.map((s, i) => (
              <div key={i} className="space-y-2">
                <Input
                  label={`Step ${i + 1} title`}
                  value={s.title}
                  onChange={(e) => setSteps((all) => all.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))}
                  error={fields?.[`steps.${i}.title`]}
                />
                <Textarea
                  label="Description"
                  value={s.body}
                  rows={3}
                  onChange={(e) => setSteps((all) => all.map((x, j) => (j === i ? { ...x, body: e.target.value } : x)))}
                  error={fields?.[`steps.${i}.body`]}
                />
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="lg" loading={pending}>
          Save homepage
        </Button>
        <a href="/" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center text-sm underline">
          View homepage ↗
        </a>
        <FormMessage result={result} />
      </div>
    </form>
  );
}
