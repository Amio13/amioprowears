import "server-only";
import type { z } from "zod";
import { fieldErrors } from "./validation";

/** JSON response that is never cached (prices, orders and payments are per-request). */
export function json(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

/**
 * Parse and validate a JSON body. Returns the data, or a 400 Response with a clear
 * message and per-field errors for the form.
 */
export async function readJson<S extends z.ZodType>(
  req: Request,
  schema: S,
): Promise<{ data: z.output<S> } | { response: Response }> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return { response: json({ error: "The request wasn't valid JSON." }, 400) };
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const fields = fieldErrors(parsed.error);
    return { response: json({ error: Object.values(fields)[0] ?? "Please check your details.", fields }, 400) };
  }
  return { data: parsed.data };
}

/** Log the real error, show the customer something useful. */
export function serverError(err: unknown, what: string): Response {
  console.error(`${what} failed`, err);
  return json({ error: "Something went wrong on our side. Please try again in a minute." }, 500);
}
