import { json, readJson, serverError } from "@/lib/api";
import { quoteCart } from "@/lib/checkout";
import { quoteSchema } from "@/lib/validation";

/** Price preview for the cart and checkout pages. Prices come from the DB, never the browser. */
export async function POST(req: Request) {
  const parsed = await readJson(req, quoteSchema);
  if ("response" in parsed) return parsed.response;
  try {
    return json(await quoteCart(parsed.data));
  } catch (err) {
    return serverError(err, "Cart quote");
  }
}
