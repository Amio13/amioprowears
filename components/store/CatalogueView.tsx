"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Sheet } from "@/components/ui/Sheet";
import {
  applyFilters,
  COLLECTION_LABELS,
  countActiveFilters,
  EMPTY_FILTERS,
  filtersToQuery,
  LIST_GROUPS,
  parseFilters,
  SORT_OPTIONS,
  toggleValue,
  type CatalogueFilters,
  type CatalogueProduct,
  type FilterOption,
  type ListGroup,
  type SortKey,
} from "@/lib/catalogue";
import { formatNaira } from "@/lib/format";
import { FilterSidebar } from "./FilterSidebar";
import { JerseyCard } from "./JerseyCard";

type Props = {
  products: CatalogueProduct[];
  options: Record<ListGroup, FilterOption[]>;
};

/**
 * Reads filters from the URL. The catalogue page is static, so this part renders
 * in the browser (inside <Suspense>); the server HTML shows the unfiltered list.
 */
export function CatalogueFromUrl(props: Props) {
  const searchParams = useSearchParams();
  const filters = useMemo(() => parseFilters(searchParams), [searchParams]);
  return <CatalogueView {...props} filters={filters} />;
}

export function CatalogueView({ products, options, filters }: Props & { filters: CatalogueFilters }) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const results = useMemo(() => applyFilters(products, filters), [products, filters]);
  const activeCount = countActiveFilters(filters);

  // pushState updates the URL (and useSearchParams) without a server round-trip,
  // and each change is a history entry, so the back button undoes it.
  function update(next: CatalogueFilters) {
    const query = filtersToQuery(next);
    window.history.pushState(null, "", query ? `/catalogue?${query}` : "/catalogue");
  }

  const heading =
    filters.collection.length === 1 && activeCount === 1
      ? COLLECTION_LABELS[filters.collection[0]!]
      : "All jerseys";
  const countText = `${results.length} ${results.length === 1 ? "jersey" : "jerseys"}`;

  return (
    <>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <h1 className="font-display text-5xl leading-none tracking-wide md:text-6xl">{heading}</h1>
        <p className="text-sm text-muted" role="status" aria-live="polite">
          {countText}
        </p>
      </div>

      {/* Toolbar: filter button (mobile) + sort */}
      <div className="sticky top-16 z-20 -mx-4 mb-4 flex items-end gap-3 border-b border-line bg-white/95 px-4 py-2 backdrop-blur lg:static lg:mx-0 lg:justify-end lg:border-0 lg:bg-transparent lg:px-0 lg:py-0">
        <Button
          variant="secondary"
          onClick={() => setSheetOpen(true)}
          className="flex-1 lg:hidden"
          aria-haspopup="dialog"
        >
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M4 6h16M7 12h10M10 18h4" strokeLinecap="round" />
          </svg>
          Filters{activeCount > 0 && ` (${activeCount})`}
        </Button>
        <Select
          label="Sort by"
          hideLabel
          value={filters.sort}
          onChange={(e) => update({ ...filters, sort: e.target.value as SortKey })}
          options={SORT_OPTIONS.map((o) => ({ value: o.value, label: `Sort: ${o.label}` }))}
          className="flex-1 lg:w-60 lg:flex-none"
        />
      </div>

      <ActiveFilterChips filters={filters} options={options} onChange={update} />

      <div className="lg:grid lg:grid-cols-[15rem_1fr] lg:gap-10">
        <aside aria-label="Filters" className="hidden lg:block">
          <FilterSidebar filters={filters} options={options} onChange={update} />
        </aside>

        {results.length > 0 ? (
          <ul className="grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 xl:grid-cols-4">
            {results.map((p, i) => (
              <li key={p.id}>
                <JerseyCard product={p} priority={i < 4} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-2xl bg-surface px-6 py-16 text-center">
            <p className="text-lg font-bold">No jerseys match these filters</p>
            <p className="mt-1 text-muted">Try removing a filter or two.</p>
            <Button className="mt-6" onClick={() => update(EMPTY_FILTERS)}>
              Clear all filters
            </Button>
          </div>
        )}
      </div>

      <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Filters" side="left">
        <FilterSidebar filters={filters} options={options} onChange={update} />
        <div className="sticky bottom-0 -mx-4 -mb-4 flex gap-3 border-t border-line bg-white p-4">
          {activeCount > 0 && (
            <Button variant="ghost" onClick={() => update({ ...EMPTY_FILTERS, sort: filters.sort })}>
              Clear all
            </Button>
          )}
          <Button className="flex-1" onClick={() => setSheetOpen(false)}>
            Show {countText}
          </Button>
        </div>
      </Sheet>
    </>
  );
}

/** Removable pills for each active filter, plus "Clear all". */
function ActiveFilterChips({
  filters,
  options,
  onChange,
}: {
  filters: CatalogueFilters;
  options: Record<ListGroup, FilterOption[]>;
  onChange: (next: CatalogueFilters) => void;
}) {
  const chips: { key: string; label: string; next: CatalogueFilters }[] = [];

  for (const group of LIST_GROUPS) {
    for (const value of filters[group] as string[]) {
      const label = options[group].find((o) => o.value === value)?.label ?? value;
      chips.push({ key: `${group}:${value}`, label, next: toggleValue(filters, group, value) });
    }
  }
  if (filters.min !== null || filters.max !== null) {
    const label =
      filters.min !== null && filters.max !== null
        ? `${formatNaira(filters.min)} – ${formatNaira(filters.max)}`
        : filters.min !== null
          ? `From ${formatNaira(filters.min)}`
          : `Up to ${formatNaira(filters.max!)}`;
    chips.push({ key: "price", label, next: { ...filters, min: null, max: null } });
  }

  if (chips.length === 0) return null;

  return (
    <ul className="mb-6 flex flex-wrap gap-2" aria-label="Active filters">
      {chips.map((c) => (
        <li key={c.key}>
          <button
            type="button"
            onClick={() => onChange(c.next)}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-surface-strong px-4 text-sm hover:bg-neutral-200 lg:min-h-9"
            aria-label={`Remove filter: ${c.label}`}
          >
            {c.label}
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </li>
      ))}
      <li>
        <button
          type="button"
          onClick={() => onChange({ ...EMPTY_FILTERS, sort: filters.sort })}
          className="inline-flex min-h-11 items-center px-2 text-sm font-medium underline underline-offset-4 hover:text-brand lg:min-h-9"
        >
          Clear all
        </button>
      </li>
    </ul>
  );
}
