import "server-only";
import { upsertNewsletterContact } from "@/lib/notify/brevo";
import { createAdminClient } from "@/lib/supabase/admin";
import type { NewsletterSubscriber } from "@/types";

/**
 * Save a subscriber in our DB first (that's the record that matters), then copy them
 * to the Brevo list. If Brevo fails, the row stays brevo_synced = false and the admin
 * "Sync to Brevo" button (Phase 6) retries it — the customer still sees success.
 */
export async function subscribe(email: string, firstName: string | undefined, source: NewsletterSubscriber["source"]): Promise<void> {
  const db = createAdminClient();
  const { error } = await db
    .from("newsletter_subscribers")
    .upsert(
      // first_name only when given, so a later sign-up without it doesn't wipe it.
      { email, source, is_active: true, brevo_synced: false, ...(firstName ? { first_name: firstName } : {}) },
      { onConflict: "email" },
    );
  if (error) throw new Error(`Saving subscriber: ${error.message}`);

  try {
    await syncSubscriberToBrevo(email, firstName);
  } catch (err) {
    console.error(`Brevo sync for a newsletter subscriber failed (will retry from admin)`, err);
  }
}

/** Copy one subscriber to Brevo and mark them synced. Also used by the admin retry. */
export async function syncSubscriberToBrevo(email: string, firstName?: string | null): Promise<void> {
  await upsertNewsletterContact(email, firstName);
  const { error } = await createAdminClient().from("newsletter_subscribers").update({ brevo_synced: true }).eq("email", email);
  if (error) throw new Error(`Marking subscriber synced: ${error.message}`);
}
