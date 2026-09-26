import "server-only";
import type { AdminContext } from "./auth";
import type { Badge, CustomizerConfig } from "@/types";

type Db = AdminContext["supabase"];

/** Every badge, hidden ones included (admin sees all). */
export async function loadAllBadges(supabase: Db): Promise<Badge[]> {
  const { data, error } = await supabase.from("badges").select("*").order("name").returns<Badge[]>();
  if (error) throw new Error(`Loading badges failed: ${error.message}`);
  return data;
}

/** Other jerseys' print positions, for "Copy positions from another jersey". */
export async function loadCopySources(supabase: Db, excludeId?: string) {
  const { data, error } = await supabase
    .from("products")
    .select("id, name, customizer")
    .order("name")
    .returns<{ id: string; name: string; customizer: CustomizerConfig }[]>();
  if (error) throw new Error(`Loading products failed: ${error.message}`);
  return data.filter((p) => p.id !== excludeId);
}
