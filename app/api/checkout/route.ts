import { json, readJson, serverError } from "@/lib/api";
import { createCheckout } from "@/lib/checkout";
import { checkoutSchema } from "@/lib/validation";

/** Create the order (server-priced) and start payment. Returns the provider's payment page URL. */
export async function POST(req: Request) {
  const parsed = await readJson(req, checkoutSchema);
  if ("response" in parsed) return parsed.response;
  try {
    const result = await createCheckout(parsed.data, new URL(req.url).origin);
    if (!result.ok) return json({ error: result.error, problems: result.problems }, result.status);
    return json({ orderId: result.orderId, orderNumber: result.orderNumber, redirectUrl: result.redirectUrl });
  } catch (err) {
    return serverError(err, "Checkout");
  }
}
