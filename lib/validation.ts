/** zod schemas for API input. Shared by client (early feedback) and server (the real check). */
import { z } from "zod";
import { isValidName, isValidNumber, NAME_MAX_LENGTH, normalizeName, normalizeNumber } from "./customizer";
import { isNigerianState } from "./delivery-zones";
import { normalizeNigerianPhone } from "./format";

/** Optional printed name: cleaned (upper-case, trimmed), then checked. "" → undefined. */
export const customNameSchema = z
  .string()
  .max(40, "Name is too long.")
  .transform(normalizeName)
  .refine((v) => v === "" || isValidName(v), {
    message: `Name can only use letters, spaces and hyphens (up to ${NAME_MAX_LENGTH}).`,
  })
  .transform((v) => v || undefined);

/** Optional printed number: 1–2 digits, kept as typed ("7", "07", "99"). "" → undefined. */
export const customNumberSchema = z
  .string()
  .max(5, "Number is too long.")
  .trim()
  .refine((v) => v === "" || /^\d{1,2}$/.test(v), { message: "Number must be between 0 and 99." })
  .transform(normalizeNumber)
  .refine((v) => v === "" || isValidNumber(v))
  .transform((v) => v || undefined);

export const MAX_BADGES = 10;

/** One cart line as the browser sends it: IDs and choices only, never prices. */
export const cartLineSchema = z.object({
  productId: z.uuid("Unknown product."),
  size: z.string().trim().min(1, "Choose a size.").max(10),
  customName: customNameSchema.optional(),
  customNumber: customNumberSchema.optional(),
  badgeIds: z.array(z.uuid("Unknown badge.")).max(MAX_BADGES, `Up to ${MAX_BADGES} badges per jersey.`).optional(),
  /** Older carts (one badge). Merged into badgeIds. */
  badgeId: z.uuid("Unknown badge.").optional(),
  quantity: z.int().min(1).max(20, "You can order up to 20 of the same jersey."),
}).transform(({ badgeId, badgeIds, ...l }) => {
  const ids = [...new Set([...(badgeIds ?? []), ...(badgeId ? [badgeId] : [])])].sort();
  return { ...l, badgeIds: ids };
});
export type CartLineInput = z.infer<typeof cartLineSchema>;

const MAX_CART_LINES = 30;
const cartLines = z
  .array(cartLineSchema)
  .min(1, "Your cart is empty.")
  .max(MAX_CART_LINES, `A cart can hold up to ${MAX_CART_LINES} different jerseys.`);

const voucherCode = z.string().trim().max(40).optional().transform((v) => v || undefined);

/** POST /api/cart/quote and /api/vouchers/validate: price preview. */
export const quoteSchema = z.object({
  lines: cartLines,
  state: z.string().trim().max(40).optional(),
  voucherCode,
});

/** Nigerian mobile → 234XXXXXXXXXX, or a clear error. */
const nigerianPhone = (label: string) =>
  z
    .string()
    .trim()
    .transform((v, ctx) => {
      const n = normalizeNigerianPhone(v);
      if (!n) {
        ctx.addIssue({ code: "custom", message: `Enter a valid Nigerian ${label}, e.g. 0803 123 4567.` });
        return z.NEVER;
      }
      return n;
    });

/** POST /api/checkout */
export const checkoutSchema = z.object({
  lines: cartLines,
  voucherCode,
  provider: z.enum(["paystack", "crypto"]).default("paystack"),
  customer: z.object({
    name: z.string().trim().min(2, "Enter your full name.").max(80, "Name is too long."),
    phone: nigerianPhone("phone number"),
    altPhone: z
      .string()
      .trim()
      .optional()
      .transform((v) => v || undefined)
      .pipe(nigerianPhone("alternative phone number").optional()),
    email: z.email("Enter a valid email address — your receipt goes there.").max(120),
    state: z.string().refine(isNigerianState, "Choose your state."),
    city: z.string().trim().min(2, "Enter your city or LGA.").max(80),
    motorPark: z.string().trim().min(2, "Enter the motor park nearest to you.").max(120),
    notes: z
      .string()
      .trim()
      .max(500, "Notes can be up to 500 characters.")
      .optional()
      .transform((v) => v || undefined),
    newsletter: z.boolean().default(false),
  }),
});
export type CheckoutInput = z.infer<typeof checkoutSchema>;

/** POST /api/track */
export const trackSchema = z.object({
  orderNumber: z
    .string()
    .trim()
    .transform((v) => v.toUpperCase().replace(/\s+/g, ""))
    .transform((v) => (/^\d+$/.test(v) ? `APW-${v}` : v))
    .pipe(z.string().regex(/^APW-\d{4,}$/, "Order numbers look like APW-1047.")),
  phone: nigerianPhone("phone number"),
});

/** Turn zod issues into { "customer.phone": "message" } for the form. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}

/** POST /api/newsletter (footer form). The checkout opt-in is handled at payment. */
export const newsletterSchema = z.object({
  email: z.string().trim().toLowerCase().max(120, "Email is too long.").pipe(z.email("Enter a valid email address.")),
  firstName: z
    .string()
    .trim()
    .max(50, "First name is too long.")
    .nullish()
    .transform((v) => v || undefined),
});
