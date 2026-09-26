"use server";

import { adminAction, dbError, revalidateStore, type ActionResult } from "../action";
import { settingsInputSchema, type SettingsInput } from "../schemas";

export async function saveSettings(input: SettingsInput): Promise<ActionResult> {
  return adminAction(settingsInputSchema, input, async (fields, { supabase }) => {
    const { data, error } = await supabase.from("settings").update(fields).eq("id", 1).select("id").maybeSingle();
    if (error) throw dbError(error, "Saving settings");
    if (!data) throw new Error("Settings row is missing — check migration 0003.");
    revalidateStore();
    return { ok: true, message: "Saved. The store updates within a minute." };
  });
}
