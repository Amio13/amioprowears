/** zod schemas for API input. Shared by client (early feedback) and server (the real check). */
import { z } from "zod";
import { isValidName, isValidNumber, NAME_MAX_LENGTH, normalizeName, normalizeNumber } from "./customizer";

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

/** One cart line as the browser sends it: IDs and choices only, never prices. */
export const cartLineSchema = z.object({
  productId: z.uuid("Unknown product."),
  size: z.string().trim().min(1, "Choose a size.").max(10),
  customName: customNameSchema.optional(),
  customNumber: customNumberSchema.optional(),
  badgeId: z.uuid("Unknown badge.").optional(),
  quantity: z.int().min(1).max(20, "You can order up to 20 of the same jersey."),
});
export type CartLineInput = z.infer<typeof cartLineSchema>;
