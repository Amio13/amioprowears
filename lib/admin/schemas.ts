/**
 * zod schemas for admin forms. The same schema checks the form in the browser and
 * the real input in the server action.
 */
import { z } from "zod";
import { COLLECTION_LABELS } from "@/lib/catalogue";
import { normalizeNigerianPhone } from "@/lib/format";
import type { CollectionSlug } from "@/types";

const money = (label: string, min = 0) =>
  z
    .number({ error: `Enter ${label}.` })
    .int(`${label[0]!.toUpperCase()}${label.slice(1)} must be whole naira.`)
    .min(min, `${label[0]!.toUpperCase()}${label.slice(1)} must be at least ₦${min}.`)
    .max(10_000_000, `${label[0]!.toUpperCase()}${label.slice(1)} looks too high.`);

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Keep this under ${max} characters.`)
    .nullish()
    .transform((v) => v || null);

/** A stored image: a full https URL (Supabase Storage) or a site path like /placeholders/x.svg. */
const imageUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v.startsWith("https://") || v.startsWith("/"), "Upload an image.");

const percent = (label: string) => z.number().min(0, `${label} can't be negative.`).max(100, `${label} can't be over 100%.`);

const overlayBox = z.object({
  top: percent("Top"),
  left: percent("Left"),
  width: percent("Width"),
  fontSize: z.number().min(1).max(60).optional(),
});

export const customizerSchema = z.object({
  name: overlayBox.optional(),
  number: overlayBox.optional(),
  badges: z
    .object({ left_chest: overlayBox.optional(), right_chest: overlayBox.optional(), sleeve: overlayBox.optional() })
    .optional(),
  textColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Pick a text colour.")
    .optional(),
  font: z.enum(["bebas", "oswald"]).optional(),
});

const COLLECTIONS = Object.keys(COLLECTION_LABELS) as [CollectionSlug, ...CollectionSlug[]];
const size = z.string().trim().min(1).max(10);

export const productInputSchema = z
  .object({
    id: z.uuid().optional(),
    name: z.string().trim().min(2, "Enter the jersey name.").max(100, "Name is too long."),
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .max(100, "Web address is too long.")
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Web address can use only a–z, 0–9 and single hyphens."),
    description: optionalText(2000),
    club: z.string().trim().min(2, "Enter the club or country.").max(60),
    gender: z.enum(["male", "female", "kids"]),
    type: z.enum(["player", "fan"]),
    era: z.enum(["current", "vintage"]),
    season: optionalText(20),
    collections: z.array(z.enum(COLLECTIONS)).max(COLLECTIONS.length),
    sizes: z.array(size).min(1, "Choose at least one size.").max(15),
    out_of_stock_sizes: z.array(size).max(15),
    price: money("the customer price", 100),
    sale_price: money("the sale price", 100).nullable(),
    image_front: imageUrl,
    image_back: imageUrl.nullable(),
    gallery: z.array(imageUrl).max(8, "Up to 8 extra photos."),
    allow_name_number: z.boolean(),
    customizer: customizerSchema,
    is_active: z.boolean(),
    is_featured: z.boolean(),
    sort_order: z.int().min(-10000).max(10000),
    badge_ids: z.array(z.uuid()).max(30),
  })
  .refine((p) => p.sale_price === null || p.sale_price < p.price, {
    path: ["sale_price"],
    message: "The sale price must be lower than the normal price.",
  })
  .refine((p) => new Set(p.sizes).size === p.sizes.length, { path: ["sizes"], message: "Each size only once." })
  .transform((p) => ({
    ...p,
    // Only sizes the product actually has can be out of stock.
    out_of_stock_sizes: p.out_of_stock_sizes.filter((s) => p.sizes.includes(s)),
    collections: [...new Set(p.collections)],
    badge_ids: [...new Set(p.badge_ids)],
  }));
export type ProductInput = z.input<typeof productInputSchema>;

export const badgeInputSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(2, "Enter the badge name.").max(60),
  image_url: imageUrl,
  price: money("the price"),
  position: z.enum(["left_chest", "right_chest", "sleeve"]),
  is_active: z.boolean(),
});
export type BadgeInput = z.input<typeof badgeInputSchema>;

export const settingsInputSchema = z.object({
  name_number_fee: money("the name + number fee"),
  store_open: z.boolean(),
  announcement: optionalText(200),
});
export type SettingsInput = z.input<typeof settingsInputSchema>;

export const ORDER_STATUSES = ["pending", "processing", "dispatched", "delivered", "cancelled"] as const;

const optionalPhone = z
  .string()
  .trim()
  .nullish()
  .transform((v, ctx) => {
    if (!v) return null;
    const n = normalizeNigerianPhone(v);
    if (!n) {
      ctx.addIssue({ code: "custom", message: "Enter a valid Nigerian phone number, e.g. 0803 123 4567." });
      return z.NEVER;
    }
    return n;
  });

export const orderUpdateSchema = z.object({
  orderId: z.uuid(),
  status: z.enum(ORDER_STATUSES),
  logistics_name: optionalText(80),
  logistics_phone: optionalPhone,
  dispatch_note: optionalText(500),
  emailCustomer: z.boolean(),
});
export type OrderUpdateInput = z.input<typeof orderUpdateSchema>;

/** "YYYY-MM-DD" (from <input type="date">) → end of that day in Lagos, as an ISO string. */
const expiryDate = z
  .string()
  .trim()
  .nullish()
  .transform((v, ctx) => {
    if (!v) return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(Date.parse(`${v}T00:00:00Z`))) {
      ctx.addIssue({ code: "custom", message: "Pick a valid date." });
      return z.NEVER;
    }
    return `${v}T23:59:59+01:00`;
  });

export const voucherInputSchema = z
  .object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .nullish()
      .transform((v) => v || null)
      .pipe(
        z
          .string()
          .regex(/^[A-Z0-9][A-Z0-9-]{2,29}$/, "Codes use 3–30 letters, numbers and hyphens.")
          .nullable(),
      ),
    quantity: z.int().min(1).max(50, "Up to 50 codes at a time."),
    discount_type: z.enum(["percent", "fixed"]),
    discount_value: z.int("Use a whole number.").min(1, "Enter the discount."),
    max_discount: money("the maximum discount", 1).nullable(),
    min_order_value: money("the minimum order"),
    max_uses: z.int().min(1, "At least 1 use.").max(100_000),
    product_ids: z.array(z.uuid()).max(200),
    expires_at: expiryDate,
    note: optionalText(200),
  })
  .refine((v) => v.discount_type !== "percent" || v.discount_value <= 100, {
    path: ["discount_value"],
    message: "A percentage can't be over 100.",
  })
  .refine((v) => v.discount_type === "fixed" || v.discount_value <= 10_000_000, { path: ["discount_value"], message: "Too high." })
  .refine((v) => v.code === null || v.quantity === 1, {
    path: ["quantity"],
    message: "Leave the code empty to generate several random codes.",
  })
  .transform((v) => ({
    ...v,
    max_discount: v.discount_type === "percent" ? v.max_discount : null,
    product_ids: v.product_ids.length ? [...new Set(v.product_ids)] : null,
  }));
export type VoucherInput = z.input<typeof voucherInputSchema>;

export const voucherUpdateSchema = z.object({
  id: z.uuid(),
  is_active: z.boolean(),
  max_uses: z.int().min(1, "At least 1 use.").max(100_000),
  expires_at: expiryDate,
  note: optionalText(200),
});
export type VoucherUpdateInput = z.input<typeof voucherUpdateSchema>;

export const bulkPriceSchema = z.object({
  productIds: z.array(z.uuid()).min(1, "Choose at least one product.").max(500),
  op: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("amount"), amount: z.int().min(-1_000_000).max(1_000_000).refine((n) => n !== 0, "Enter an amount.") }),
    z.object({ kind: z.literal("percent"), percent: z.number().min(-90).max(500).refine((n) => n !== 0, "Enter a percentage.") }),
    z.object({ kind: z.literal("set-net"), net: z.int().min(100).max(10_000_000) }),
  ]),
  alsoSale: z.boolean(),
});
export type BulkPriceInput = z.input<typeof bulkPriceSchema>;
