import { HomepageForm, type HomepageProduct } from "@/components/admin/HomepageForm";
import { PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth";
import { resolveHomepage } from "@/lib/homepage";

export const metadata = { title: "Homepage" };

export default async function HomepageAdminPage() {
  const { supabase } = await requireAdmin();
  const [settings, products] = await Promise.all([
    supabase.from("settings").select("homepage").eq("id", 1).single<{ homepage: unknown }>(),
    supabase
      .from("products")
      .select("id, name, image_front, image_back")
      .eq("is_active", true)
      .order("name")
      .returns<HomepageProduct[]>(),
  ]);
  if (products.error) throw new Error(`Loading products failed: ${products.error.message}`);
  const missingColumn = settings.error?.code === "42703";
  if (settings.error && !missingColumn) throw new Error(`Loading homepage settings failed: ${settings.error.message}`);

  return (
    <>
      <PageHeader title="Homepage" description="Choose what customers see first." />
      {missingColumn && (
        <p className="mb-4 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Database update <strong>0007_homepage.sql</strong> hasn&apos;t been applied yet, so saving won&apos;t work. Run it in the Supabase SQL Editor first.
        </p>
      )}
      <HomepageForm config={resolveHomepage(settings.data?.homepage)} products={products.data} />
    </>
  );
}
