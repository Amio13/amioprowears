import { markPaymentSuccessful } from "@/lib/payments/confirm-db";
import { getProvider } from "@/lib/payments";

/**
 * Paystack webhook. The signature (HMAC SHA-512 of the raw body) is checked in
 * parseWebhook before anything is trusted; then the same idempotent
 * markPaymentSuccessful runs as on the redirect — so a customer who closes the tab
 * before being redirected still gets their order confirmed.
 */
export async function POST(req: Request) {
  const event = await getProvider("paystack").parseWebhook(req);
  // Invalid signature or an event we don't need: acknowledge so Paystack stops retrying.
  if (!event) return new Response(null, { status: 200 });

  try {
    const result = await markPaymentSuccessful(event.reference);
    console.log(`Paystack webhook ${event.reference}: ${result.status}`);
    return new Response(null, { status: 200 });
  } catch (err) {
    // 500 makes Paystack retry later, which is what we want if our DB was briefly down.
    console.error(`Paystack webhook ${event.reference} failed`, err);
    return new Response(null, { status: 500 });
  }
}
