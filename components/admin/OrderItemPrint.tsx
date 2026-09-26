import Image from "next/image";
import { NameNumberOverlay } from "@/components/store/JerseyOverlay";
import { describePrintStyle } from "@/lib/customizer";
import type { OrderItem } from "@/types";

/**
 * What to produce for one order item: the back photo with the customer's name and
 * number in the font, curve and colour they saw, plus each badge's picture. Orders
 * placed before migration 0010 have no saved print style or badge pictures, so only
 * the text line (shown by the caller) is available for them.
 */
export function OrderItemPrint({ item }: { item: OrderItem }) {
  const style = item.print_style;
  const badges = item.badges ?? [];
  const hasPrint = Boolean(style && (item.custom_name || item.custom_number));
  if (!hasPrint && badges.length === 0) return null;

  return (
    <div className="mt-3 flex flex-wrap items-start gap-4">
      {hasPrint && style && (
        <figure className="w-44">
          <div className="relative aspect-[4/5] overflow-hidden rounded-lg bg-surface-strong">
            {style.imageBack ? (
              <Image src={style.imageBack} alt="" fill sizes="176px" className="object-cover" unoptimized />
            ) : (
              <div className="absolute inset-0 bg-neutral-800" />
            )}
            <NameNumberOverlay config={style} name={item.custom_name ?? ""} number={item.custom_number ?? ""} />
          </div>
          <figcaption className="mt-1 text-xs text-muted">{describePrintStyle(style)}</figcaption>
        </figure>
      )}
      {badges.length > 0 && (
        <ul className="grid grid-cols-3 gap-2" aria-label="Badges">
          {badges.map((b) => (
            <li key={b.id} className="w-20 text-center text-xs">
              <Image src={b.image_url} alt="" width={80} height={80} className="size-20 rounded-lg bg-surface object-contain p-1.5" unoptimized />
              <span className="mt-1 block leading-tight">{b.name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
