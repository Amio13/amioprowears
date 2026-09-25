import { cn } from "@/components/ui/cn";
import { formatNaira } from "@/lib/format";
import { effectivePrice } from "@/lib/pricing";

/** Customer price; if on sale, the sale price in red with the original struck through. */
export function Price({
  price,
  salePrice,
  size = "md",
  className,
}: {
  price: number;
  salePrice: number | null;
  size?: "md" | "lg";
  className?: string;
}) {
  const current = effectivePrice({ price, sale_price: salePrice });
  const onSale = current < price;

  return (
    <p className={cn("flex flex-wrap items-baseline gap-x-2", size === "lg" ? "text-2xl" : "text-base", className)}>
      <span className={cn("font-bold", onSale && "text-brand")}>
        {onSale && <span className="sr-only">Sale price </span>}
        {formatNaira(current)}
      </span>
      {onSale && (
        <s className={cn("text-muted", size === "lg" ? "text-lg" : "text-sm")}>
          <span className="sr-only">Was </span>
          {formatNaira(price)}
        </s>
      )}
    </p>
  );
}
