import "server-only";

/**
 * Brevo (https://developers.brevo.com/reference). Two calls only: send one
 * transactional email, and add/update a newsletter contact. Plain fetch — no SDK,
 * so nothing heavy runs on the Worker.
 */

const API = "https://api.brevo.com/v3";

function apiKey(): string {
  const key = process.env.BREVO_API_KEY;
  if (!key) throw new Error("BREVO_API_KEY is not set");
  return key;
}

async function brevo(path: string, body: unknown): Promise<void> {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "api-key": apiKey(), "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    // Brevo explains itself in the body, e.g. "unrecognised IP address" when Authorised IPs is on.
    const detail = await res.text().catch(() => "");
    throw new Error(`Brevo ${path} failed (${res.status}): ${detail.slice(0, 300)}`);
  }
}

export interface Email {
  to: { email: string; name?: string };
  subject: string;
  html: string;
  text: string;
}

export async function sendEmail(email: Email): Promise<void> {
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  if (!senderEmail) throw new Error("BREVO_SENDER_EMAIL is not set");
  const support = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;
  await brevo("/smtp/email", {
    sender: { email: senderEmail, name: process.env.BREVO_SENDER_NAME || "Amioprowears" },
    to: [email.to],
    // Customers who hit "Reply" reach the support inbox, not the no-reply sender.
    ...(support ? { replyTo: { email: support } } : {}),
    subject: email.subject,
    htmlContent: email.html,
    textContent: email.text,
  });
}

/** Add (or update) a contact on the newsletter list. Safe to repeat. */
export async function upsertNewsletterContact(email: string, firstName?: string | null): Promise<void> {
  const listId = Number(process.env.BREVO_LIST_ID);
  if (!Number.isInteger(listId) || listId <= 0) throw new Error("BREVO_LIST_ID is not set");
  await brevo("/contacts", {
    email,
    ...(firstName ? { attributes: { FIRSTNAME: firstName } } : {}),
    listIds: [listId],
    updateEnabled: true,
  });
}
