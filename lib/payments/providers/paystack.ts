import type { PaymentProvider, VerifyResult } from "../types";

/**
 * Paystack (https://paystack.com/docs/api/). Money is integer naira everywhere
 * else; it's converted to kobo (× 100) only here, at the API boundary.
 */

const API = "https://api.paystack.co";

function secretKey(): string {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new Error("PAYSTACK_SECRET_KEY is not set");
  return key;
}

async function paystack<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  const body = (await res.json().catch(() => null)) as { status?: boolean; message?: string; data?: T } | null;
  if (!res.ok || !body?.status || body.data === undefined) {
    throw new Error(`Paystack ${path} failed (${res.status}): ${body?.message ?? "no response body"}`);
  }
  return body.data;
}

export const toKobo = (naira: number) => Math.round(naira * 100);
export const fromKobo = (kobo: number) => kobo / 100;

/** Paystack transaction statuses → ours. "abandoned" = the customer left without paying. */
export function mapPaystackStatus(status: string): VerifyResult["status"] {
  if (status === "success") return "success";
  if (status === "failed" || status === "abandoned" || status === "reversed") return "failed";
  return "pending"; // ongoing, pending, processing, queued
}

/** HMAC SHA-512 of the raw body with the secret key, as lowercase hex (Paystack's x-paystack-signature). */
export async function paystackSignature(rawBody: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-512" }, false, [
    "sign",
  ]);
  const mac = await crypto.subtle.sign("HMAC", key, enc.encode(rawBody));
  return [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Compares two strings in constant time, so the check doesn't leak how much matched. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function isValidPaystackSignature(rawBody: string, signature: string | null, secret: string) {
  if (!signature) return false;
  return safeEqual(await paystackSignature(rawBody, secret), signature.toLowerCase());
}

export const paystackProvider: PaymentProvider = {
  id: "paystack",
  label: "Card, bank transfer or USSD",
  isEnabled: () => Boolean(process.env.PAYSTACK_SECRET_KEY),

  async initialize({ reference, amountNaira, email, callbackUrl, metadata }) {
    const data = await paystack<{ authorization_url: string; reference: string }>("/transaction/initialize", {
      method: "POST",
      body: JSON.stringify({
        email,
        amount: toKobo(amountNaira),
        currency: "NGN",
        reference,
        callback_url: callbackUrl,
        // "Cancel payment" on Paystack's page also comes back to our confirmation page.
        metadata: { ...metadata, cancel_action: callbackUrl },
      }),
    });
    return { reference: data.reference, redirectUrl: data.authorization_url };
  },

  async verify(reference) {
    const data = await paystack<{ status: string; amount: number; currency: string; fees: number | null }>(
      `/transaction/verify/${encodeURIComponent(reference)}`,
    );
    return {
      // Only naira payments count; anything else is treated as a mismatch by the amount check.
      status: mapPaystackStatus(data.status),
      amountNaira: data.currency === "NGN" ? fromKobo(data.amount) : Number.NaN,
      providerFee: data.fees == null ? undefined : Math.round(fromKobo(data.fees)),
      raw: data,
    };
  },

  async parseWebhook(req) {
    const raw = await req.text();
    const valid = await isValidPaystackSignature(raw, req.headers.get("x-paystack-signature"), secretKey());
    if (!valid) {
      console.warn("Paystack webhook: invalid signature, ignored");
      return null;
    }
    const event = JSON.parse(raw) as { event?: string; data?: { reference?: string } };
    // Only successful charges matter; confirm.ts re-verifies with the API anyway.
    if (event.event !== "charge.success" || !event.data?.reference) return null;
    return { reference: event.data.reference };
  },
};
