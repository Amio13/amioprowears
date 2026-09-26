import { ExternalLink } from "lucide-react";
import { notFound } from "next/navigation";
import { ProductForm, type EditableProduct } from "@/components/admin/ProductForm";
import { BackLink, PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth";
import { loadAllBadges, loadCopySources } from "@/lib/admin/catalogue";
import type { Product } from "@/types";

export const metadata = { title: "Edit jersey" };

export default async function EditProductPage({ params, searchParams }: PageProps<"/admin/products/[id]">) {
  const { supabase } = await requireAdmin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { saved } = await searchParams;

  const [product, badges, copySources] = await Promise.all([
    supabase.from("products").select("*, product_badges(badge_id)").eq("id", id).maybeSingle<Product & { product_badges: { badge_id: string }[] }>(),
    loadAllBadges(supabase),
    loadCopySources(supabase, id),
  ]);
  if (product.error) throw new Error(`Loading jersey failed: ${product.error.message}`);
  if (!product.data) notFound();
  const { product_badges, ...rest } = product.data;
  const editable: EditableProduct = { ...rest, badge_ids: product_badges.map((b) => b.badge_id) };

  return (
    <>
      <BackLink href="/admin/products">Products</BackLink>
      <PageHeader
        title={editable.name}
        description={saved ? "Jersey added. It's live in the store if “Show in store” is ticked." : undefined}
        actions={
          editable.is_active ? (
            <a href={`/jersey/${editable.slug}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1.5 text-sm underline">
              <ExternalLink className="size-4" />
              View in store
            </a>
          ) : undefined
        }
      />
      {/* key: reset the form state when switching between products. */}
      <ProductForm key={editable.id} product={editable} badges={badges} copySources={copySources} />
    </>
  );
}
