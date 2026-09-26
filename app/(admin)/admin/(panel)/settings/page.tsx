import { SettingsForm } from "@/components/admin/SettingsForm";
import { PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth";
import { resolveDeliveryFees } from "@/lib/delivery-zones";
import type { Settings } from "@/types";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("settings")
    .select("*")
    .eq("id", 1)
    .single<Pick<Settings, "name_number_fee" | "store_open" | "announcement"> & Record<string, unknown>>();
  if (error) throw new Error(`Loading settings failed: ${error.message}`);
  return (
    <>
      <PageHeader title="Settings" />
      <SettingsForm settings={data} deliveryFees={resolveDeliveryFees(data)} />
    </>
  );
}
