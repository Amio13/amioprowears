import Link from "next/link";
import { ProductForm } from "@/components/admin/ProductForm";
import { PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth";
import { loadAllBadges, loadCopySources } from "@/lib/admin/catalogue";

export const metadata = { title: "Add jersey" };

export default async function NewProductPage() {
  const { supabase } = await requireAdmin();
  const [badges, copySources] = await Promise.all([loadAllBadges(supabase), loadCopySources(supabase)]);
  return (
    <>
      <Link href="/admin/products" className="mb-2 inline-flex min-h-11 items-center text-sm text-muted hover:text-ink">
        ← Products
      </Link>
      <PageHeader title="Add jersey" />
      <ProductForm badges={badges} copySources={copySources} />
    </>
  );
}
