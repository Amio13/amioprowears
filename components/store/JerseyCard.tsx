import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { inStockSizes, type CatalogueProduct } from "@/lib/catalogue";
import { effectivePrice } from "@/lib/pricing";
import { Price } from "./Price";

/**
 * Product tile for grids and collection rows. No hooks, so it works in both
 * server pages (homepage) and the client-rendered catalogue grid.
 */
export function JerseyCard({ product, priority = false }: { product: CatalogueProduct; priority?: boolean }) {
  const onSale = effectivePrice(product) < product.price;
  const soldOut = inStockSizes(product).length === 0;
  const subtitle = [product.club, product.season].filter(Boolean).join(" · ");

  return (
    <Link href={`/jersey/${product.slug}`} className="group block rounded-2xl">
      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-surface">
        <Image
          src={product.image_front}
          alt={`${product.name}, front view`}
          fill
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
          className="object-contain transition-opacity duration-300"
          priority={priority}
          unoptimized
        />
        {/* On devices with a mouse, hovering shows the back of the shirt. */}
        {product.image_back && (
          <Image
            src={product.image_back}
            alt=""
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="object-contain opacity-0 transition-opacity duration-300 [@media(hover:hover)]:group-hover:opacity-100"
            unoptimized
          />
        )}
        <div className="absolute left-2 top-2 flex flex-col items-start gap-1">
          {soldOut ? <Badge>Sold out</Badge> : onSale && <Badge tone="brand">Sale</Badge>}
        </div>
      </div>
      <div className="mt-2 space-y-0.5 px-0.5">
        <h3 className="line-clamp-2 text-sm font-medium leading-snug group-hover:underline group-hover:underline-offset-4 sm:text-base">
          {product.name}
        </h3>
        {subtitle && <p className="text-xs text-muted sm:text-sm">{subtitle}</p>}
        <Price price={product.price} salePrice={product.sale_price} className="pt-0.5" />
      </div>
    </Link>
  );
}
