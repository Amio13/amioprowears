import { z } from "zod";
import { json, readJson, serverError } from "@/lib/api";
import { quoteCart } from "@/lib/checkout";
import { quoteSchema } from "@/lib/validation";

const schema = quoteSchema.extend({ voucherCode: z.string().trim().min(1, "Enter a voucher code.").max(40) });

/**
 * Preview a voucher against the cart. This does NOT use it up — the real check runs
 * again in /api/checkout, and redemption happens only when payment is confirmed.
 */
export async function POST(req: Request) {
  const parsed = await readJson(req, schema);
  if ("response" in parsed) return parsed.response;
  try {
    const quote = await quoteCart(parsed.data);
    const v = quote.voucher!;
    return json(v.ok ? { ok: true, discount: v.discount, quote } : { ok: false, error: v.error, quote }, v.ok ? 200 : 422);
  } catch (err) {
    return serverError(err, "Voucher check");
  }
}
