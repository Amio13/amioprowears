/**
 * Server-side order pricing (CLAUDE.md rule 2). The browser sends only IDs and
 * choices (cartLineSchema); every price here comes from DB rows passed in `data`.
 * Pure — the DB loading lives in lib/checkout.ts — so it's fully unit-tested.
 */
import { getDeliveryForState, type DeliveryZoneId } from "./delivery-zones";
import { effectivePrice, lineUnitPrice } from "./pricing";
import type { CartLineInput } from "./validation";
import { computeVoucherDiscount, type VoucherResult, type VoucherRules } from "./vouchers";
import type { Badge, Product } from "@/types";

export type PricingProduct = Pick<
  Product,
  | "id"
  | "slug"
  | "name"
  | "price"
  | "sale_price"
  | "sizes"
  | "out_of_stock_sizes"
  | "allow_name_number"
  | "is_active"
  | "image_front"
>;
export type PricingBadge = Pick<Badge, "id" | "name" | "price" | "is_active">;

export const PRICING_PRODUCT_COLUMNS =
  "id, slug, name, price, sale_price, sizes, out_of_stock_sizes, allow_name_number, is_active, image_front";

export interface PricingData {
  products: Map<string, PricingProduct>;
  badges: Map<string, PricingBadge>;
  /** "productId:badgeId" pairs from product_badges. */
  allowedBadges: Set<string>;
  nameNumberFee: number;
}

export interface PricedLine {
  /** Position in the cart the browser sent, so it can show errors next to the right line. */
  index: number;
  productId: string;
  slug: string;
  image: string;
  productName: string;
  size: string;
  customName?: string;
  customNumber?: string;
  badgeId?: string;
  badgeName?: string;
  /** Jersey price used (sale price if on sale). */
  unitPrice: number;
  customizationFee: number;
  badgePrice: number;
  quantity: number;
  lineTotal: number;
}

export interface LineProblem {
  index: number;
  error: string;
}

export function priceLines(
  lines: CartLineInput[],
  data: PricingData,
): { lines: PricedLine[]; problems: LineProblem[] } {
  const priced: PricedLine[] = [];
  const problems: LineProblem[] = [];

  lines.forEach((line, index) => {
    const product = data.products.get(line.productId);
    const fail = (error: string) => problems.push({ index, error });

    if (!product || !product.is_active) return fail("This jersey is no longer available. Please remove it.");
    if (!product.sizes.includes(line.size)) return fail(`Size ${line.size} isn't available for this jersey.`);
    if (product.out_of_stock_sizes.includes(line.size)) return fail(`Size ${line.size} is sold out. Please choose another size.`);

    const hasNameOrNumber = Boolean(line.customName || line.customNumber);
    if (hasNameOrNumber && !product.allow_name_number) {
      return fail("Name and number printing isn't available for this jersey.");
    }

    let badge: PricingBadge | undefined;
    if (line.badgeId) {
      badge = data.badges.get(line.badgeId);
      if (!badge || !badge.is_active || !data.allowedBadges.has(`${product.id}:${badge.id}`)) {
        return fail("That badge isn't available for this jersey. Please remove it.");
      }
    }

    const customizationFee = hasNameOrNumber ? data.nameNumberFee : 0;
    const badgePrice = badge?.price ?? 0;
    const each = lineUnitPrice({ product, nameNumberFee: data.nameNumberFee, hasNameOrNumber, badgePrice });

    priced.push({
      index,
      productId: product.id,
      slug: product.slug,
      image: product.image_front,
      productName: product.name,
      size: line.size,
      customName: line.customName,
      customNumber: line.customNumber,
      badgeId: badge?.id,
      badgeName: badge?.name,
      unitPrice: effectivePrice(product),
      customizationFee,
      badgePrice,
      quantity: line.quantity,
      lineTotal: each * line.quantity,
    });
  });

  return { lines: priced, problems };
}

export interface OrderQuote {
  lines: PricedLine[];
  problems: LineProblem[];
  subtotal: number;
  delivery: { zone: DeliveryZoneId; fee: number } | null;
  /** null when no code was entered. */
  voucher: (VoucherResult & { code: string }) | null;
  discount: number;
  total: number;
}

/**
 * Full order total: items + delivery (once per order, by state) − voucher.
 * `state` may be empty on the cart page (delivery not known yet).
 */
export function priceOrder({
  lines,
  data,
  state,
  voucherCode,
  voucher,
  now,
}: {
  lines: CartLineInput[];
  data: PricingData;
  state?: string;
  voucherCode?: string;
  voucher?: VoucherRules | null;
  now?: Date;
}): OrderQuote {
  const { lines: priced, problems } = priceLines(lines, data);
  const subtotal = priced.reduce((n, l) => n + l.lineTotal, 0);
  const delivery = state ? getDeliveryForState(state) : null;

  const voucherResult = voucherCode
    ? { code: voucherCode, ...computeVoucherDiscount(voucher ?? null, priced, now) }
    : null;
  const discount = voucherResult?.ok ? voucherResult.discount : 0;

  return {
    lines: priced,
    problems,
    subtotal,
    delivery,
    voucher: voucherResult,
    discount,
    total: subtotal - discount + (delivery?.fee ?? 0),
  };
}
