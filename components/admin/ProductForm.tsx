"use client";

import { ImagePlus, Plus, Save, Trash2, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Spinner } from "@/components/ui/Spinner";
import type { ActionResult } from "@/lib/admin/action";
import { deleteProduct, saveProduct } from "@/lib/admin/actions/products";
import { BADGE_POSITION_LABELS } from "@/lib/admin/labels";
import type { ProductInput } from "@/lib/admin/schemas";
import { COLLECTION_LABELS, ERA_LABELS, GENDER_LABELS, slugify, TYPE_LABELS } from "@/lib/catalogue";
import { DEFAULT_CUSTOMIZER } from "@/lib/customizer";
import { formatNaira } from "@/lib/format";
import { PRODUCT_PHOTO } from "@/lib/image-compress";
import type { Badge, CollectionSlug, CustomizerConfig, Product } from "@/types";
import { CustomizerPositionEditor } from "./CustomizerPositionEditor";
import { ImageUpload, uploadImage } from "./ImageUpload";
import { NetPriceInput } from "./NetPriceInput";
import { Card, Checkbox, FormMessage, Textarea } from "./ui";

const ADULT_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "3XL"];
const KIDS_SIZES = ["4-5Y", "6-7Y", "8-9Y", "10-11Y", "12-13Y"];

export type EditableProduct = Product & { badge_ids: string[] };

type Form = Omit<ProductInput, "price"> & { price: number | null };

function initialForm(p?: EditableProduct): Form {
  if (!p) {
    return {
      name: "",
      slug: "",
      description: "",
      club: "",
      gender: "male",
      type: "fan",
      era: "current",
      season: "",
      collections: ["new-arrivals"],
      sizes: ["S", "M", "L", "XL", "XXL"],
      out_of_stock_sizes: [],
      price: null,
      sale_price: null,
      image_front: "",
      image_back: null,
      gallery: [],
      allow_name_number: true,
      customizer: DEFAULT_CUSTOMIZER,
      is_active: true,
      is_featured: false,
      sort_order: 0,
      badge_ids: [],
    };
  }
  // Extra fields (created_at…) are dropped by the server's zod schema.
  return { ...p };
}

function Chip({ on, onClick, children, tone = "default" }: { on: boolean; onClick: () => void; children: React.ReactNode; tone?: "default" | "warn" }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        "min-h-11 min-w-11 rounded-full border px-3 text-sm font-medium",
        on ? (tone === "warn" ? "border-brand bg-red-50 text-brand line-through" : "border-ink bg-ink text-white") : "border-line bg-white",
      )}
    >
      {children}
    </button>
  );
}

export function ProductForm({
  product,
  badges,
  copySources,
}: {
  product?: EditableProduct;
  badges: Badge[];
  copySources: { id: string; name: string; customizer: CustomizerConfig }[];
}) {
  const router = useRouter();
  const [form, setForm] = useState<Form>(() => initialForm(product));
  const [slugTouched, setSlugTouched] = useState(Boolean(product));
  const [customSize, setCustomSize] = useState("");
  const [galleryBusy, setGalleryBusy] = useState(false);
  const [galleryError, setGalleryError] = useState<string | null>(null);
  const galleryInput = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState<ActionResult<unknown> | null>(null);
  const [pending, startTransition] = useTransition();
  const [deleting, startDelete] = useTransition();

  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((f) => ({ ...f, [key]: value }));
  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const fields = result && !result.ok ? result.fields : undefined;
  const chosenBadges = badges.filter((b) => form.badge_ids.includes(b.id));

  async function addGalleryPhotos(files: FileList | null) {
    if (!files?.length) return;
    setGalleryBusy(true);
    setGalleryError(null);
    try {
      for (const file of Array.from(files).slice(0, 8 - form.gallery.length)) {
        const url = await uploadImage(file, "product-images", "products", PRODUCT_PHOTO);
        setForm((f) => ({ ...f, gallery: [...f.gallery, url] }));
      }
    } catch (err) {
      setGalleryError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setGalleryBusy(false);
      if (galleryInput.current) galleryInput.current.value = "";
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (form.price === null) {
      setResult({ ok: false, error: "Enter the price.", fields: { price: "Enter the price." } });
      return;
    }
    const input: ProductInput = { ...form, price: form.price };
    startTransition(async () => {
      const r = await saveProduct(input);
      setResult(r);
      if (r.ok && !product && r.data) router.replace(`/admin/products/${r.data.id}?saved=1`);
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4 pb-24 md:pb-0">
      <Card title="Photos">
        <p className="mb-3 text-sm text-muted">
          Flat-lay photos work best. They&apos;re resized and padded to 4:5 automatically so the name and number line up.
        </p>
        <div className="grid grid-cols-2 gap-4 sm:max-w-md">
          <ImageUpload
            label="Front"
            required
            value={form.image_front || null}
            onChange={(url) => set("image_front", url ?? "")}
            bucket="product-images"
            folder="products"
            options={PRODUCT_PHOTO}
            error={fields?.image_front && "Add the front photo."}
          />
          <ImageUpload
            label="Back"
            hint="Needed to preview name & number."
            value={form.image_back}
            onChange={(url) => set("image_back", url)}
            bucket="product-images"
            folder="products"
            options={PRODUCT_PHOTO}
          />
        </div>
        <div className="mt-4">
          <p className="mb-1 text-sm font-medium">
            More photos <span className="font-normal text-muted">(optional, up to 8)</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {form.gallery.map((src) => (
              <div key={src} className="relative aspect-[4/5] w-20 overflow-hidden rounded-lg bg-surface">
                <Image src={src} alt="" fill sizes="80px" className="object-cover" unoptimized />
                <button
                  type="button"
                  onClick={() => set("gallery", form.gallery.filter((g) => g !== src))}
                  className="absolute right-0 top-0 flex size-8 items-center justify-center rounded-bl-lg bg-white/90"
                  aria-label="Remove photo"
                >
                  <X className="size-4" />
                </button>
              </div>
            ))}
            {form.gallery.length < 8 && (
              <button
                type="button"
                onClick={() => galleryInput.current?.click()}
                disabled={galleryBusy}
                className="flex aspect-[4/5] w-20 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-line bg-surface text-sm text-muted"
              >
                {galleryBusy ? (
                  <Spinner label="Uploading" />
                ) : (
                  <>
                    <ImagePlus className="size-5" />
                    Add
                  </>
                )}
              </button>
            )}
          </div>
          <input ref={galleryInput} type="file" accept="image/*" multiple className="sr-only" onChange={(e) => addGalleryPhotos(e.target.files)} />
          {galleryError && <p className="mt-1 text-sm text-brand">{galleryError}</p>}
        </div>
      </Card>

      <Card title="Details">
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Jersey name"
            value={form.name}
            placeholder="e.g. Arsenal Home 2025/26"
            onChange={(e) => {
              const name = e.target.value;
              setForm((f) => ({ ...f, name, ...(slugTouched ? {} : { slug: slugify(name) }) }));
            }}
            error={fields?.name}
            required
          />
          <Input label="Club or country" value={form.club} placeholder="e.g. Arsenal" onChange={(e) => set("club", e.target.value)} error={fields?.club} required />
          <Select label="For" value={form.gender} onChange={(e) => set("gender", e.target.value as Form["gender"])} options={Object.entries(GENDER_LABELS).map(([value, label]) => ({ value, label }))} />
          <Select label="Version" value={form.type} onChange={(e) => set("type", e.target.value as Form["type"])} options={Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label }))} />
          <Select label="Era" value={form.era} onChange={(e) => set("era", e.target.value as Form["era"])} options={Object.entries(ERA_LABELS).map(([value, label]) => ({ value, label }))} />
          <Input label="Season (optional)" value={form.season ?? ""} placeholder="e.g. 2025/26 or 1994" onChange={(e) => set("season", e.target.value)} error={fields?.season} />
          <Textarea label="Description (optional)" className="sm:col-span-2" value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} rows={3} error={fields?.description} />
          <Input
            label="Web address"
            className="sm:col-span-2"
            value={form.slug}
            onChange={(e) => {
              setSlugTouched(true);
              set("slug", e.target.value.toLowerCase());
            }}
            hint={`amioprowears.com/jersey/${form.slug || "…"}`}
            error={fields?.slug}
            required
          />
        </div>
        <fieldset className="mt-4">
          <legend className="mb-1 text-sm font-medium">Collections</legend>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(COLLECTION_LABELS) as CollectionSlug[]).map((c) => (
              <Chip key={c} on={form.collections.includes(c)} onClick={() => set("collections", toggle(form.collections, c))}>
                {COLLECTION_LABELS[c]}
              </Chip>
            ))}
          </div>
        </fieldset>
      </Card>

      <Card title="Price">
        <div className="grid gap-3 sm:grid-cols-2">
          <NetPriceInput label="Price" kind="jersey" value={form.price} onChange={(v) => set("price", v)} error={fields?.price} />
          <NetPriceInput label="Sale price" kind="jersey" optional value={form.sale_price} onChange={(v) => set("sale_price", v)} error={fields?.sale_price} />
        </div>
        {form.sale_price !== null && (
          <button type="button" className="mt-2 inline-flex min-h-11 items-center gap-1.5 text-sm text-muted hover:text-brand" onClick={() => set("sale_price", null)}>
            <X className="size-4" />
            Remove sale price
          </button>
        )}
      </Card>

      <Card title="Sizes">
        <p className="mb-2 text-sm text-muted">Tap to choose the sizes this jersey comes in.</p>
        <div className="flex flex-wrap gap-2">
          {[...ADULT_SIZES, ...KIDS_SIZES, ...form.sizes.filter((s) => !ADULT_SIZES.includes(s) && !KIDS_SIZES.includes(s))].map((s) => (
            <Chip key={s} on={form.sizes.includes(s)} onClick={() => set("sizes", toggle(form.sizes, s))}>
              {s}
            </Chip>
          ))}
        </div>
        <div className="mt-2 flex max-w-xs items-end gap-2">
          <Input label="Other size" value={customSize} onChange={(e) => setCustomSize(e.target.value.toUpperCase().slice(0, 10))} className="flex-1" />
          <Button
            variant="secondary"
            onClick={() => {
              const s = customSize.trim();
              if (s && !form.sizes.includes(s)) set("sizes", [...form.sizes, s]);
              setCustomSize("");
            }}
          >
            <Plus />
            Add
          </Button>
        </div>
        {fields?.sizes && <p className="mt-1 text-sm text-brand">{fields.sizes}</p>}
        {form.sizes.length > 0 && (
          <fieldset className="mt-4">
            <legend className="mb-1 text-sm font-medium">Out of stock</legend>
            <p className="mb-2 text-sm text-muted">Tap a size to mark it sold out. Customers can&apos;t choose it.</p>
            <div className="flex flex-wrap gap-2">
              {form.sizes.map((s) => (
                <Chip key={s} tone="warn" on={form.out_of_stock_sizes.includes(s)} onClick={() => set("out_of_stock_sizes", toggle(form.out_of_stock_sizes, s))}>
                  {s}
                </Chip>
              ))}
            </div>
          </fieldset>
        )}
      </Card>

      <Card title="Customisation">
        <Checkbox label="Customers can add a name and number" checked={form.allow_name_number} onChange={(e) => set("allow_name_number", e.target.checked)} />
        <fieldset className="mt-2">
          <legend className="mb-1 text-sm font-medium">Badges allowed on this jersey</legend>
          {badges.length === 0 ? (
            <p className="text-sm text-muted">No badges yet — add them under Badges.</p>
          ) : (
            <div className="grid gap-1 sm:grid-cols-2">
              {badges.map((b) => (
                <Checkbox
                  key={b.id}
                  checked={form.badge_ids.includes(b.id)}
                  onChange={() => set("badge_ids", toggle(form.badge_ids, b.id))}
                  label={`${b.name}${b.is_active ? "" : " (hidden)"}`}
                  hint={`${BADGE_POSITION_LABELS[b.position]} · ${formatNaira(b.price)}`}
                />
              ))}
            </div>
          )}
        </fieldset>

        <h3 className="mb-2 mt-4 text-sm font-bold">Print positions</h3>
        {copySources.length > 0 && (
          <Select
            label="Copy positions from another jersey"
            className="mb-3 max-w-sm"
            placeholder="Choose a jersey…"
            value=""
            onChange={(e) => {
              const src = copySources.find((c) => c.id === e.target.value);
              if (src) set("customizer", src.customizer);
            }}
            options={copySources.map((c) => ({ value: c.id, label: c.name }))}
          />
        )}
        <CustomizerPositionEditor
          value={form.customizer}
          onChange={(c) => set("customizer", c)}
          imageFront={form.image_front || null}
          imageBack={form.image_back}
          badges={chosenBadges}
          allowNameNumber={form.allow_name_number}
        />
      </Card>

      <Card title="Visibility">
        <Checkbox label="Show in store" hint="Untick to hide this jersey without deleting it." checked={form.is_active} onChange={(e) => set("is_active", e.target.checked)} />
        <Checkbox label="Feature on the homepage" checked={form.is_featured} onChange={(e) => set("is_featured", e.target.checked)} />
        <Input
          label="Sort order"
          type="number"
          inputMode="numeric"
          className="mt-2 max-w-40"
          value={String(form.sort_order)}
          onChange={(e) => set("sort_order", Number.parseInt(e.target.value, 10) || 0)}
          hint="Lower numbers show first."
        />
      </Card>

      {product && (
        <Card title="Delete">
          <p className="mb-3 text-sm text-muted">Only jerseys that have never been ordered can be deleted.</p>
          <Button
            variant="secondary"
            loading={deleting}
            onClick={() => {
              if (!window.confirm(`Delete "${product.name}" permanently?`)) return;
              startDelete(async () => {
                const r = await deleteProduct({ id: product.id });
                setResult(r);
                if (r.ok) router.push("/admin/products");
              });
            }}
          >
            {!deleting && <Trash2 />}
            Delete jersey
          </Button>
        </Card>
      )}

      {/* Save bar: sticky at the bottom on phones so it's always reachable. */}
      <div className="fixed inset-x-0 bottom-0 z-20 flex items-center gap-3 border-t border-line bg-white px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:static md:rounded-2xl md:border-0 md:shadow-sm">
        <Button type="submit" size="lg" loading={pending} disabled={galleryBusy}>
          {!pending && (product ? <Save /> : <Plus />)}
          {product ? "Save changes" : "Add jersey"}
        </Button>
        <div className="min-w-0 flex-1">
          <FormMessage result={result} />
        </div>
      </div>
    </form>
  );
}
