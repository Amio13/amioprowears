import Link from "next/link";
import { Card, PageHeader } from "@/components/admin/ui";
import { cn } from "@/components/ui/cn";
import { breakdown, earliestPeriodStart, ordersSince, periodStart, PERIODS, totals, type AnalyticsOrder, type Period } from "@/lib/admin/analytics";
import { requireAdmin } from "@/lib/admin/auth";
import { formatNaira } from "@/lib/format";

export const metadata = { title: "Analytics" };

function Table({ rows, first, empty }: { rows: { key: string; cells: (string | number)[] }[]; first: string[]; empty: string }) {
  if (rows.length === 0) return <p className="text-sm text-muted">{empty}</p>;
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-muted">
          {first.map((h, i) => (
            <th key={h} className={cn("pb-2 font-medium", i > 0 && "text-right")}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-line">
        {rows.map((r) => (
          <tr key={r.key}>
            {r.cells.map((c, i) => (
              <td key={i} className={cn("py-2", i > 0 && "text-right tabular-nums")}>
                {c}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default async function AnalyticsPage({ searchParams }: PageProps<"/admin/analytics">) {
  const { supabase } = await requireAdmin();
  const { period: rawPeriod } = await searchParams;
  const period: Period = PERIODS.some((p) => p.value === rawPeriod) ? (rawPeriod as Period) : "month";
  const now = new Date();

  // Paid orders since the earliest period start, in pages of 1,000 (Supabase's limit).
  const orders: AnalyticsOrder[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("orders")
      .select("total, discount, paid_at, state, delivery_zone, voucher_code, order_items(product_name, quantity, item_total)")
      .eq("payment_status", "paid")
      .gte("paid_at", earliestPeriodStart(now).toISOString())
      .order("paid_at")
      .range(from, from + 999)
      .returns<AnalyticsOrder[]>();
    if (error) throw new Error(`Loading sales failed: ${error.message}`);
    orders.push(...data);
    if (data.length < 1000) break;
  }

  const inPeriod = ordersSince(orders, periodStart(period, now));
  const b = breakdown(inPeriod);
  const periodLabel = PERIODS.find((p) => p.value === period)!.label.toLowerCase();

  return (
    <>
      <PageHeader title="Analytics" description="Paid orders only. Paystack fees are estimates for local cards." />

      <div className="mb-6 grid gap-3 md:grid-cols-3">
        {PERIODS.map((p) => {
          const t = totals(ordersSince(orders, periodStart(p.value, now)));
          return (
            <Link
              key={p.value}
              href={`/admin/analytics?period=${p.value}`}
              aria-current={p.value === period ? "page" : undefined}
              className={cn("rounded-2xl bg-white p-4 shadow-sm", p.value === period && "ring-2 ring-ink")}
            >
              <p className="text-sm font-medium text-muted">{p.label}</p>
              <p className="mt-1 text-2xl font-bold">{formatNaira(t.revenue)}</p>
              <p className="text-sm">
                {t.orders} order{t.orders === 1 ? "" : "s"}
              </p>
              <p className="mt-2 text-xs text-muted">
                Paystack ≈ {formatNaira(t.fees)} · You receive ≈ <span className="font-medium text-ink">{formatNaira(t.net)}</span>
              </p>
            </Link>
          );
        })}
      </div>

      <h2 className="mb-3 text-lg font-bold">Breakdown for {periodLabel}</h2>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Top-selling jerseys">
          <Table
            first={["Jersey", "Sold", "Sales"]}
            empty="No sales yet."
            rows={b.topProducts.slice(0, 10).map((r) => ({ key: r.key, cells: [r.key, r.quantity, formatNaira(r.revenue)] }))}
          />
        </Card>
        <Card title="Orders by state">
          <Table
            first={["State", "Orders", "Sales"]}
            empty="No orders yet."
            rows={b.byState.map((r) => ({ key: r.key, cells: [r.key, r.orders, formatNaira(r.revenue)] }))}
          />
        </Card>
        <Card title="Orders by delivery zone">
          <Table
            first={["Zone", "Orders", "Sales"]}
            empty="No orders yet."
            rows={b.byZone.map((r) => ({ key: r.key, cells: [`Zone ${r.key}`, r.orders, formatNaira(r.revenue)] }))}
          />
        </Card>
        <Card title="Voucher usage">
          <Table
            first={["Code", "Orders", "Discount", "Sales"]}
            empty="No vouchers used."
            rows={b.vouchers.map((r) => ({ key: r.key, cells: [r.key, r.orders, formatNaira(r.discount), formatNaira(r.revenue)] }))}
          />
        </Card>
      </div>
    </>
  );
}
