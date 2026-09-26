"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { syncSubscriberToBrevo } from "@/lib/newsletter";
import { adminAction, dbError, type ActionResult } from "../action";

/**
 * Each subscriber takes 2 outgoing requests (Brevo + our DB), and the Workers Free
 * plan allows 50 per page load, so sync in batches of 20. The owner presses the
 * button again if more are left.
 */
const BATCH = 20;

export async function syncUnsyncedSubscribers(): Promise<ActionResult> {
  return adminAction(z.undefined(), undefined, async (_, { supabase }) => {
    const { data, error, count } = await supabase
      .from("newsletter_subscribers")
      .select("email, first_name", { count: "exact" })
      .eq("brevo_synced", false)
      .eq("is_active", true)
      .order("subscribed_at")
      .limit(BATCH)
      .returns<{ email: string; first_name: string | null }[]>();
    if (error) throw dbError(error, "Loading subscribers");
    if (!data.length) return { ok: true, message: "Everyone is already in Brevo." };

    let synced = 0;
    let lastError = "";
    for (const s of data) {
      try {
        await syncSubscriberToBrevo(s.email, s.first_name);
        synced++;
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
        console.error("Brevo sync failed", err);
      }
    }
    revalidatePath("/admin/newsletter");

    const left = (count ?? data.length) - synced;
    if (synced === 0) return { ok: false, error: `Brevo sync failed: ${lastError}` };
    return { ok: true, message: `Synced ${synced}.${left > 0 ? ` ${left} still to sync — press the button again.` : ""}` };
  });
}
