"use server";

import { homepageSchema, type HomepageInput } from "@/lib/homepage";
import { adminAction, dbError, revalidateStore, type ActionResult } from "../action";

export async function saveHomepage(input: HomepageInput): Promise<ActionResult> {
  return adminAction(homepageSchema, input, async (homepage, { supabase }) => {
    const { data, error } = await supabase.from("settings").update({ homepage }).eq("id", 1).select("id").maybeSingle();
    if (error?.code === "PGRST204" || error?.code === "42703") throw new Error("Database update 0007_homepage.sql hasn't been applied yet.");
    if (error) throw dbError(error, "Saving the homepage");
    if (!data) throw new Error("Settings row is missing — check migration 0003.");
    revalidateStore();
    return { ok: true, message: "Saved. The homepage updates within a minute." };
  });
}
