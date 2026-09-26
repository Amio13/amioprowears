import { json, readJson, serverError } from "@/lib/api";
import { subscribe } from "@/lib/newsletter";
import { newsletterSchema } from "@/lib/validation";

/** Footer sign-up. Saved in our DB, then copied to the Brevo list (lib/newsletter.ts). */
export async function POST(req: Request) {
  const parsed = await readJson(req, newsletterSchema);
  if ("response" in parsed) return parsed.response;

  try {
    await subscribe(parsed.data.email, parsed.data.firstName, "footer");
    return json({ ok: true });
  } catch (err) {
    return serverError(err, "Newsletter sign-up");
  }
}
