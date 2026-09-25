"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { fieldClasses } from "@/components/ui/Input";
import {
  GROUP_LABELS,
  LIST_GROUPS,
  toggleValue,
  type CatalogueFilters,
  type FilterOption,
  type ListGroup,
} from "@/lib/catalogue";

/** Filter controls, used in the desktop sidebar and inside the mobile filter sheet. */
export function FilterSidebar({
  filters,
  options,
  onChange,
}: {
  filters: CatalogueFilters;
  options: Record<ListGroup, FilterOption[]>;
  onChange: (next: CatalogueFilters) => void;
}) {
  return (
    <div className="divide-y divide-line">
      {LIST_GROUPS.map((group) =>
        options[group].length === 0 ? null : (
          <fieldset key={group} className="py-4 first:pt-0">
            <legend className="float-left mb-2 w-full text-sm font-bold uppercase tracking-wide">
              {GROUP_LABELS[group]}
            </legend>
            {group === "size" ? (
              <SizePills filters={filters} options={options.size} onChange={onChange} />
            ) : (
              <ul className="clear-left">
                {options[group].map((o) => {
                  const checked = (filters[group] as string[]).includes(o.value);
                  return (
                    <li key={o.value}>
                      <label className="flex min-h-11 cursor-pointer items-center gap-3 lg:min-h-9">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => onChange(toggleValue(filters, group, o.value))}
                          className="size-5 shrink-0 accent-brand"
                        />
                        <span className="text-sm">{o.label}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </fieldset>
        ),
      )}
      <PriceRange filters={filters} onChange={onChange} />
    </div>
  );
}

function SizePills({
  filters,
  options,
  onChange,
}: {
  filters: CatalogueFilters;
  options: FilterOption[];
  onChange: (next: CatalogueFilters) => void;
}) {
  return (
    <div className="clear-left flex flex-wrap gap-2">
      {options.map((o) => {
        const checked = filters.size.includes(o.value);
        return (
          <label key={o.value} className="cursor-pointer">
            <input
              type="checkbox"
              checked={checked}
              onChange={() => onChange(toggleValue(filters, "size", o.value))}
              className="peer sr-only"
            />
            <span
              className={cn(
                "flex min-h-11 min-w-11 items-center justify-center rounded-lg border px-3 text-sm font-medium",
                "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand",
                checked ? "border-ink bg-ink text-white" : "border-line bg-white hover:border-ink",
              )}
            >
              {o.label}
            </span>
          </label>
        );
      })}
    </div>
  );
}

/** Min/max price in naira. Applied on "Apply" (or Enter), not on every keystroke. */
function PriceRange({
  filters,
  onChange,
}: {
  filters: CatalogueFilters;
  onChange: (next: CatalogueFilters) => void;
}) {
  // Re-mount the form when the URL values change (e.g. "Clear all", back button)
  // so the inputs show what's actually applied.
  return <PriceRangeForm key={`${filters.min}-${filters.max}`} filters={filters} onChange={onChange} />;
}

function PriceRangeForm({
  filters,
  onChange,
}: {
  filters: CatalogueFilters;
  onChange: (next: CatalogueFilters) => void;
}) {
  const [min, setMin] = useState(filters.min?.toString() ?? "");
  const [max, setMax] = useState(filters.max?.toString() ?? "");

  const toAmount = (v: string) => {
    const digits = v.replace(/\D/g, "");
    return digits ? Number(digits) : null;
  };

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    let lo = toAmount(min);
    let hi = toAmount(max);
    if (lo !== null && hi !== null && lo > hi) [lo, hi] = [hi, lo]; // typed the wrong way round
    onChange({ ...filters, min: lo, max: hi });
  }

  return (
    <form onSubmit={onSubmit} className="py-4">
      <fieldset>
        <legend className="mb-2 text-sm font-bold uppercase tracking-wide">Price (₦)</legend>
        <div className="flex items-end gap-2">
          <label className="flex-1">
            <span className="mb-1 block text-xs text-muted">Min</span>
            <input
              inputMode="numeric"
              value={min}
              onChange={(e) => setMin(e.target.value)}
              placeholder="0"
              className={fieldClasses}
            />
          </label>
          <span className="pb-3 text-muted" aria-hidden="true">
            –
          </span>
          <label className="flex-1">
            <span className="mb-1 block text-xs text-muted">Max</span>
            <input
              inputMode="numeric"
              value={max}
              onChange={(e) => setMax(e.target.value)}
              placeholder="Any"
              className={fieldClasses}
            />
          </label>
        </div>
        <Button type="submit" variant="secondary" className="mt-3 w-full">
          Apply price
        </Button>
      </fieldset>
    </form>
  );
}
