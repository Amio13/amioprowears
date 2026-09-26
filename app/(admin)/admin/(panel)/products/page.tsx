import { Plus, Search, Tags } from "lucide-react";
import Form from "next/form";
import Image from "next/image";
import Link from "next/link";
import { Empty, PageHeader } from "@/components/admin/ui";
import { Badge } from "@/components/ui/Badge";
import { buttonClasses } from "@/components/ui/Button";
import { fieldClasses } from "@/components/ui/Input";
import { requireAdmin } from "@/lib/admin/auth";
import { formatNaira } from "@/lib/format";
import { effectivePrice } from "@/lib/pricing";
import type { Product } from "@/types";

export const metadata = { title: "Products" };

type Row = Pick<Product, "id" | "name" | "club" | "price" | "sale_price" | "image_front" | "is_active" | "is_featured" | "sizes" | "out_of_stock_sizes">;

export default async function ProductsPage({ searchParams }: PageProps<"/admin/products">) {
  const { supabase } = await requireAdmin();
  const { q: rawQ } = await searchParams;
  const q = (typeof rawQ === "string" ? rawQ : "").trim().slice(0, 60);

  const { data, error } = await supabase
    .from("products")
    .select("id, name, club, price, sale_price, image_front, is_active, is_featured, sizes, out_of_stock_sizes")
    .order("is_active", { ascending: false })
    .order("sort_order")
    .order("created_at", { ascending: false })
    .returns<Row[]>();
  if (error) throw new Error(`Loading products failed: ${error.message}`);
  const needle = q.toLowerCase();
  const products = needle ? data.filter((p) => `${p.name} ${p.club}`.toLowerCase().includes(needle)) : data;

  return (
    <>
      <PageHeader
        title="Products"
        description={`${data.filter((p) => p.is_active).length} in store, ${data.filter((p) => !p.is_active).length} hidden`}
        actions={
          <>
            <Link href="/admin/products/bulk-price" className={buttonClasses({ variant: "secondary" })}>
              <Tags />
              Bulk price
            </Link>
            <Link href="/admin/products/new" className={buttonClasses()}>
              <Plus />
              Add jersey
            </Link>
          </>
        }
      />
      <Form action="/admin/products" className="mb-4 flex max-w-md gap-2">
        <input name="q" defaultValue={q} placeholder="Search name or club" aria-label="Search products" className={fieldClasses} />
        <button type="submit" className={buttonClasses({ variant: "secondary" })} aria-label="Search">
          <Search />
          <span className="max-sm:hidden">Search</span>
        </button>
      </Form>

      {products.length === 0 ? (
        <Empty>{q ? "No jerseys match that search." : "No jerseys yet. Add your first one."}</Empty>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {products.map((p) => {
            const soldOut = p.out_of_stock_sizes.filter((s) => p.sizes.includes(s));
            return (
              <li key={p.id}>
                <Link href={`/admin/products/${p.id}`} className="flex gap-3 rounded-2xl bg-white p-3 shadow-sm hover:ring-2 hover:ring-line">
                  <div className="relative aspect-[4/5] w-20 shrink-0 overflow-hidden rounded-lg bg-surface">
                    <Image src={p.image_front} alt="" fill sizes="80px" className="object-cover" unoptimized />
                  </div>
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="font-bold leading-snug">{p.name}</p>
                    <p className="text-muted">{p.club}</p>
                    <p className="mt-1">
                      {formatNaira(effectivePrice(p))}
                      {effectivePrice(p) < p.price && <span className="ml-2 text-muted line-through">{formatNaira(p.price)}</span>}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {!p.is_active && <Badge>Hidden</Badge>}
                      {p.is_featured && <Badge tone="info">Featured</Badge>}
                      {soldOut.length > 0 && <Badge tone="warning">Sold out: {soldOut.join(", ")}</Badge>}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
