"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { Input } from "@/components/ui/Input";
import {
  NAME_MAX_LENGTH,
  normalizeName,
  normalizeNumber,
  resolveCustomizer,
  sanitizeNameInput,
  sanitizeNumberInput,
} from "@/lib/customizer";
import { formatNaira } from "@/lib/format";
import { effectivePrice, lineUnitPrice } from "@/lib/pricing";
import { useCart } from "@/store/cart";
import type { Badge, BadgePosition, Product } from "@/types";
import { BadgeOverlay, NameNumberOverlay } from "./JerseyOverlay";
import { ProductGallery, type GalleryImage } from "./ProductGallery";

type CustomizerProduct = Pick<
  Product,
  | "id"
  | "name"
  | "price"
  | "sale_price"
  | "sizes"
  | "out_of_stock_sizes"
  | "allow_name_number"
  | "customizer"
  | "image_front"
  | "image_back"
  | "gallery"
>;

const POSITION_LABELS: Record<BadgePosition, string> = {
  left_chest: "Chest",
  right_chest: "Chest",
  sleeve: "Sleeve",
};

const FRONT = 0;
const BACK = 1;

/**
 * Product photos + live customiser (name, number, badge) + size + "Add to cart".
 * Mobile: while customising, the preview sticks under the header and the options
 * scroll beneath it; "Add to cart" lives in a sticky bottom bar. Desktop: two
 * columns, preview left (sticky), options right.
 *
 * Prices shown here are a preview only — the cart stores IDs and choices, and the
 * server recalculates everything at checkout.
 */
export function JerseyCustomizer({
  product,
  badges,
  nameNumberFee,
  header,
  children,
}: {
  product: CustomizerProduct;
  badges: Badge[];
  nameNumberFee: number;
  /** Title and base price, rendered above the options. */
  header: ReactNode;
  /** Description and details, rendered below the options. */
  children: ReactNode;
}) {
  const config = resolveCustomizer(product.customizer);
  const inStock = product.sizes.filter((s) => !product.out_of_stock_sizes.includes(s));
  const soldOut = inStock.length === 0;
  const canCustomise = product.allow_name_number || badges.length > 0;

  const [size, setSize] = useState<string | null>(inStock.length === 1 ? inStock[0]! : null);
  const [customising, setCustomising] = useState(false);
  const [name, setName] = useState("");
  const [number, setNumber] = useState("");
  const [badgeId, setBadgeId] = useState<string | null>(null);
  const [jump, setJump] = useState<{ index: number; key: number }>();
  const [message, setMessage] = useState<{ tone: "error" | "ok"; text: string } | null>(null);
  const add = useCart((s) => s.add);
  const previewRef = useRef<HTMLDivElement>(null);
  useStickyScrollPadding(previewRef, customising);

  // What actually gets printed: nothing unless "Customise" is chosen.
  const printName = customising && product.allow_name_number ? normalizeName(name) : "";
  const printNumber = customising && product.allow_name_number ? normalizeNumber(number) : "";
  const badge = customising ? (badges.find((b) => b.id === badgeId) ?? null) : null;
  const hasNameOrNumber = Boolean(printName || printNumber);
  const total = lineUnitPrice({ product, nameNumberFee, hasNameOrNumber, badgePrice: badge?.price ?? 0 });

  const show = (index: number) => setJump({ index, key: Date.now() });

  const images: GalleryImage[] = [
    {
      src: product.image_front,
      alt: `${product.name}, front view`,
      label: "Front",
      overlay: <BadgeOverlay config={config} badge={badge} />,
    },
    ...(product.image_back
      ? [
          {
            src: product.image_back,
            alt: `${product.name}, back view`,
            label: "Back",
            overlay: <NameNumberOverlay config={config} name={printName} number={printNumber} />,
          },
        ]
      : []),
    ...product.gallery.map((src, i) => ({ src, alt: `${product.name}, photo ${i + 3}` })),
  ];

  function addToCart() {
    if (!size) {
      setMessage({ tone: "error", text: "Choose a size first." });
      document.getElementById("size-picker")?.scrollIntoView({ block: "center" });
      return;
    }
    add({
      productId: product.id,
      size,
      customName: printName || undefined,
      customNumber: printNumber || undefined,
      badgeId: badge?.id,
    });
    const extras = [printName, printNumber && `#${printNumber}`, badge && `${badge.name} badge`].filter(Boolean);
    setMessage({
      tone: "ok",
      text: `Added to your cart: size ${size}${extras.length ? `, ${extras.join(", ")}` : ""}.`,
    });
  }

  const addButton = (
    <Button size="lg" onClick={addToCart} disabled={soldOut} className="w-full">
      {soldOut ? "Sold out" : `Add to cart · ${formatNaira(total)}`}
    </Button>
  );

  return (
    <>
      <div className="group grid gap-6 md:grid-cols-2 md:gap-10 lg:gap-16">
        {/* Preview */}
        <div
          ref={previewRef}
          className={cn(
            "md:sticky md:top-24 md:self-start",
            customising &&
              "max-md:sticky max-md:top-16 max-md:z-20 max-md:-mx-4 max-md:border-b max-md:border-line max-md:bg-white max-md:px-4 max-md:pb-2",
          )}
        >
          {/* While customising on a phone, shrink the preview so the inputs have room —
              and more while typing, so the preview and the field both fit above the keyboard. */}
          <div
            className={cn(
              customising &&
                "max-md:mx-auto max-md:max-w-[calc(36svh*0.8)] max-md:group-has-[[data-print-input]:focus]:max-w-[calc(24svh*0.8)]",
            )}
          >
            <ProductGallery images={images} jumpTo={jump} />
          </div>
          <p className="sr-only" aria-live="polite">
            {hasNameOrNumber || badge
              ? `Preview: ${[printName && `name ${printName}`, printNumber && `number ${printNumber}`, badge && `${badge.name} badge`].filter(Boolean).join(", ")}.`
              : ""}
          </p>
        </div>

        {/* Options */}
        <div className="space-y-6">
          {header}

          <SizePicker
            sizes={product.sizes}
            outOfStock={product.out_of_stock_sizes}
            value={size}
            onChange={(s) => {
              setSize(s);
              setMessage(null);
            }}
          />

          {canCustomise && (
            <fieldset className="space-y-4">
              <legend className="mb-2 text-sm font-bold">Customise</legend>
              <div className="grid grid-cols-2 gap-2">
                <ChoiceButton selected={!customising} onClick={() => setCustomising(false)}>
                  Plain jersey
                </ChoiceButton>
                <ChoiceButton
                  selected={customising}
                  onClick={() => {
                    setCustomising(true);
                    show(product.allow_name_number && product.image_back ? BACK : FRONT);
                  }}
                >
                  {product.allow_name_number ? "Add name & number" : "Add a badge"}
                </ChoiceButton>
              </div>

              {customising && (
                <div className="space-y-5 rounded-2xl bg-surface p-4">
                  {product.allow_name_number && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-[1fr_6rem] gap-3">
                        <Input
                          label="Name"
                          value={name}
                          onChange={(e) => setName(sanitizeNameInput(e.target.value))}
                          onFocus={() => product.image_back && show(BACK)}
                          data-print-input
                          autoComplete="off"
                          autoCapitalize="characters"
                          spellCheck={false}
                          placeholder="OKOCHA"
                          hint={`${name.length}/${NAME_MAX_LENGTH} · letters, spaces, hyphens`}
                        />
                        <Input
                          label="Number"
                          value={number}
                          onChange={(e) => setNumber(sanitizeNumberInput(e.target.value))}
                          onFocus={() => product.image_back && show(BACK)}
                          data-print-input
                          inputMode="numeric"
                          pattern="[0-9]*"
                          autoComplete="off"
                          placeholder="10"
                          hint="e.g. 7 or 07"
                        />
                      </div>
                      <p className="text-sm text-muted">
                        {formatNaira(nameNumberFee)} for a name, a number or both.
                      </p>
                    </div>
                  )}

                  {badges.length > 0 && (
                    <fieldset>
                      <legend className="mb-2 text-sm font-medium">Badge</legend>
                      <div className="space-y-2">
                        <BadgeOption
                          checked={badgeId === null}
                          onChange={() => setBadgeId(null)}
                          title="No badge"
                        />
                        {badges.map((b) => (
                          <BadgeOption
                            key={b.id}
                            checked={badgeId === b.id}
                            onChange={() => {
                              setBadgeId(b.id);
                              show(FRONT);
                            }}
                            title={b.name}
                            subtitle={POSITION_LABELS[b.position]}
                            price={b.price}
                            image={b.image_url}
                          />
                        ))}
                      </div>
                    </fieldset>
                  )}
                </div>
              )}
            </fieldset>
          )}

          {(hasNameOrNumber || badge) && (
            <dl className="space-y-1 border-t border-line pt-4 text-sm">
              <SummaryRow term="Jersey" value={effectivePrice(product)} />
              {hasNameOrNumber && (
                <SummaryRow
                  term={`Name & number (${[printName, printNumber && `#${printNumber}`].filter(Boolean).join(" ")})`}
                  value={nameNumberFee}
                />
              )}
              {badge && <SummaryRow term={`${badge.name} badge`} value={badge.price} />}
              <SummaryRow term="Total" value={total} strong />
            </dl>
          )}

          <p
            role={message?.tone === "error" ? "alert" : "status"}
            className={cn("min-h-5 text-sm", message?.tone === "error" ? "text-brand" : "text-green-700")}
          >
            {message?.text}
          </p>

          {/* Desktop: inline button */}
          <div className="hidden md:block">{addButton}</div>

          {children}
        </div>
      </div>

      {/* Mobile: sticky bar. globals.css reserves room for it below the footer. */}
      <div
        data-sticky-bar
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 md:hidden"
      >
        {addButton}
      </div>
    </>
  );
}

/**
 * On phones the header, the sticky preview (while customising) and the sticky
 * "Add to cart" bar cover the top and bottom of the screen. Tell the browser, via
 * scroll-padding, so when it scrolls a focused input or tapped option into view it
 * lands in the visible band between them instead of underneath.
 */
function useStickyScrollPadding(previewRef: RefObject<HTMLDivElement | null>, customising: boolean) {
  useEffect(() => {
    const preview = previewRef.current;
    if (!preview) return;
    const root = document.documentElement;
    const phone = window.matchMedia("(width < 48rem)");
    const HEADER_PX = 64; // h-16 header; the preview sticks at top-16
    const BAR_PX = 88; // sticky bar (~76px) + breathing room

    const update = () => {
      root.style.scrollPaddingTop =
        phone.matches && customising ? `${HEADER_PX + preview.offsetHeight + 8}px` : phone.matches ? `${HEADER_PX + 8}px` : "";
      root.style.scrollPaddingBottom = phone.matches ? `${BAR_PX}px` : "";
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(preview);
    phone.addEventListener("change", update);
    return () => {
      observer.disconnect();
      phone.removeEventListener("change", update);
      root.style.scrollPaddingTop = "";
      root.style.scrollPaddingBottom = "";
    };
  }, [previewRef, customising]);
}

function SizePicker({
  sizes,
  outOfStock,
  value,
  onChange,
}: {
  sizes: string[];
  outOfStock: string[];
  value: string | null;
  onChange: (size: string) => void;
}) {
  return (
    <fieldset id="size-picker" className="scroll-mt-24">
      <legend className="mb-2 flex w-full justify-between text-sm font-bold">
        Size
        {value && <span className="font-normal text-muted">Selected: {value}</span>}
      </legend>
      <div className="grid grid-cols-5 gap-2">
        {sizes.map((s) => {
          const unavailable = outOfStock.includes(s);
          return (
            <label key={s} className={cn(unavailable ? "cursor-not-allowed" : "cursor-pointer")}>
              <input
                type="radio"
                name="size"
                value={s}
                checked={value === s}
                disabled={unavailable}
                onChange={() => onChange(s)}
                className="peer sr-only"
              />
              <span
                className={cn(
                  "flex min-h-12 items-center justify-center rounded-lg border px-1 text-sm font-medium",
                  "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand",
                  unavailable
                    ? "border-line bg-surface text-neutral-400 line-through"
                    : value === s
                      ? "border-ink bg-ink text-white"
                      : "border-line hover:border-ink",
                )}
              >
                {s}
                {unavailable && <span className="sr-only"> (sold out)</span>}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function ChoiceButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "min-h-12 rounded-lg border px-3 text-sm font-medium transition-colors",
        selected ? "border-ink bg-ink text-white" : "border-line bg-white hover:border-ink",
      )}
    >
      {children}
    </button>
  );
}

function BadgeOption({
  checked,
  onChange,
  title,
  subtitle,
  price,
  image,
}: {
  checked: boolean;
  onChange: () => void;
  title: string;
  subtitle?: string;
  price?: number;
  image?: string;
}) {
  return (
    <label
      className={cn(
        "flex min-h-14 cursor-pointer items-center gap-3 rounded-lg border bg-white px-3 py-2",
        "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand",
        checked ? "border-ink ring-1 ring-ink" : "border-line hover:border-ink",
      )}
    >
      <input type="radio" name="badge" checked={checked} onChange={onChange} className="size-5 shrink-0 accent-brand" />
      {image && <Image src={image} alt="" width={36} height={36} className="size-9 shrink-0" unoptimized />}
      <span className="flex-1 text-sm">
        <span className="block font-medium">{title}</span>
        {subtitle && <span className="block text-xs text-muted">{subtitle}</span>}
      </span>
      {price !== undefined && <span className="text-sm font-medium">+{formatNaira(price)}</span>}
    </label>
  );
}

function SummaryRow({ term, value, strong }: { term: string; value: number; strong?: boolean }) {
  return (
    <div className={cn("flex justify-between gap-4", strong && "pt-1 text-base font-bold")}>
      <dt className={cn(!strong && "text-muted")}>{term}</dt>
      <dd>{formatNaira(value)}</dd>
    </div>
  );
}
