import { getAdmin } from "@/lib/admin/auth";
import { toCsv } from "@/lib/admin/csv";
import { lagosDay } from "@/lib/format";
import type { NewsletterSubscriber } from "@/types";

/** GET /admin/newsletter/export — every subscriber as a CSV file. */
export async function GET() {
  const admin = await getAdmin();
  if (!admin) return new Response("Please log in.", { status: 401 });

  // Supabase returns at most 1,000 rows per request, so read in pages.
  const rows: NewsletterSubscriber[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await admin.supabase
      .from("newsletter_subscribers")
      .select("*")
      .order("subscribed_at")
      .range(from, from + 999)
      .returns<NewsletterSubscriber[]>();
    if (error) return new Response(`Export failed: ${error.message}`, { status: 500 });
    rows.push(...data);
    if (data.length < 1000) break;
  }

  const csv = toCsv(
    ["email", "first_name", "source", "subscribed", "active", "in_brevo"],
    rows.map((s) => [s.email, s.first_name, s.source, s.subscribed_at.slice(0, 10), s.is_active, s.brevo_synced]),
  );
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="subscribers-${lagosDay(new Date())}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
