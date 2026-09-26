import { ProductForm } from "@/components/admin/ProductForm";
import { BackLink, PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth";
import { loadAllBadges, loadCopySources } from "@/lib/admin/catalogue";

export const metadata = { title: "Add jersey" };

export default async function NewProductPage() {
  const { supabase } = await requireAdmin();
  const [badges, copySources] = await Promise.all([loadAllBadges(supabase), loadCopySources(supabase)]);
  return (
    <>
      <BackLink href="/admin/products">Products</BackLink>
      <PageHeader title="Add jersey" />
      <ProductForm badges={badges} copySources={copySources} />
    </>
  );
}
