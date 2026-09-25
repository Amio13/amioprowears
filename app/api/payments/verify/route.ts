import { json, serverError } from "@/lib/api";
import { markPaymentSuccessful } from "@/lib/payments/confirm-db";

/**
 * GET /api/payments/verify?reference=… — re-checks a payment with the provider.
 * The confirmation page polls this while a payment is still processing.
 */
export async function GET(req: Request) {
  const reference = new URL(req.url).searchParams.get("reference")?.trim();
  if (!reference || !/^[A-Za-z0-9-]{6,80}$/.test(reference)) {
    return json({ error: "Missing or invalid payment reference." }, 400);
  }
  try {
    const result = await markPaymentSuccessful(reference);
    return json({ status: result.status }, result.status === "not_found" ? 404 : 200);
  } catch (err) {
    return serverError(err, "Payment verify");
  }
}
