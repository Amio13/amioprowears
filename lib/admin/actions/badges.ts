"use server";

import { z } from "zod";
import { adminAction, dbError, revalidateStore, type ActionResult } from "../action";
import { badgeInputSchema, type BadgeInput } from "../schemas";

export async function saveBadge(input: BadgeInput): Promise<ActionResult> {
  return adminAction(badgeInputSchema, input, async ({ id, ...row }, { supabase }) => {
    const { data, error } = id
      ? await supabase.from("badges").update(row).eq("id", id).select("id").maybeSingle()
      : await supabase.from("badges").insert(row).select("id").single();
    if (error) throw dbError(error, "Saving the badge");
    if (!data) throw new Error("Badge not found.");
    revalidateStore();
    return { ok: true, message: id ? "Saved." : "Badge added. Allow it on jerseys from each jersey's page." };
  });
}

export async function deleteBadge(input: { id: string }): Promise<ActionResult> {
  return adminAction(z.object({ id: z.uuid() }), input, async ({ id }, { supabase }) => {
    const { error } = await supabase.from("badges").delete().eq("id", id);
    if (error?.code === "23503") {
      return { ok: false, error: "This badge is in past orders, so it can't be deleted. Untick \"Show in store\" to hide it instead." };
    }
    if (error) throw dbError(error, "Deleting the badge");
    revalidateStore();
    return { ok: true, message: "Deleted." };
  });
}
