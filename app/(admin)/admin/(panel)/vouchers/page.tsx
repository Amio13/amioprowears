import Link from "next/link";
import { VoucherForm } from "@/components/admin/VoucherForm";
import { Card, Empty, PageHeader } from "@/components/admin/ui";
import { Badge } from "@/components/ui/Badge";
import { requireAdmin } from "@/lib/admin/auth";
import { describeDiscount, voucherState } from "@/lib/admin/labels";
import { formatDate, formatNaira } from "@/lib/format";
import type { Voucher } from "@/types";

export const metadata = { title: "Vouchers" };

export default async function VouchersPage() {
  const { supabase } = await requireAdmin();
  const [vouchers, paidOrders, products] = await Promise.all([
    supabase.from("vouchers").select("*").order("created_at", { ascending: false }).returns<Voucher[]>(),
    supabase
      .from("orders")
      .select("voucher_id, total")
      .not("voucher_id", "is", null)
      .eq("payment_status", "paid")
      .returns<{ voucher_id: string; total: number }[]>(),
    supabase.from("products").select("id, name").order("name").returns<{ id: string; name: string }[]>(),
  ]);
  for (const r of [vouchers, paidOrders, products]) if (r.error) throw new Error(`Loading vouchers failed: ${r.error.message}`);

  const revenue = new Map<string, number>();
  for (const o of paidOrders.data!) revenue.set(o.voucher_id, (revenue.get(o.voucher_id) ?? 0) + o.total);

  return (
    <>
      <PageHeader title="Vouchers" />
      <Card title="Create a voucher" className="mb-4">
        <VoucherForm products={products.data!} />
      </Card>

      {vouchers.data!.length === 0 ? (
        <Empty>No vouchers yet.</Empty>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl bg-white shadow-sm">
          {vouchers.data!.map((v) => {
            const state = voucherState(v);
            return (
              <li key={v.id}>
                <Link href={`/admin/vouchers/${v.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-surface">
                  <span className="font-mono font-bold">{v.code}</span>
                  <Badge tone={state.tone}>{state.label}</Badge>
                  <span className="min-w-0 flex-1 text-sm">{describeDiscount(v, formatNaira)}</span>
                  <span className="w-full text-sm text-muted md:w-auto">
                    Used {v.used_count}/{v.max_uses} · {formatNaira(revenue.get(v.id) ?? 0)} sales
                    {v.expires_at && ` · until ${formatDate(v.expires_at)}`}
                    {v.note && ` · ${v.note}`}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
