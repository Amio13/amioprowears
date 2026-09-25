import { getProvider } from "@/lib/payments";

/** Reserved for crypto payments (SPEC 3.6). 404 while crypto is disabled. */
export async function POST() {
  if (!getProvider("crypto").isEnabled()) return new Response("Not found", { status: 404 });
  return new Response("Not implemented", { status: 501 });
}
