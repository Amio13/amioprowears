import { BulkPriceUpdate, type BulkProduct } from "@/components/admin/BulkPriceUpdate";
import { BackLink, PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth";

export const metadata = { title: "Bulk price update" };

export default async function BulkPricePage() {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("products")
    .select("id, name, club, collections, gender, price, sale_price, is_active")
    .order("name")
    .returns<BulkProduct[]>();
  if (error) throw new Error(`Loading products failed: ${error.message}`);
  return (
    <>
      <BackLink href="/admin/products">Products</BackLink>
      <PageHeader title="Bulk price update" description="Change many prices at once. Check the preview before you save." />
      <BulkPriceUpdate products={data} />
    </>
  );
}
