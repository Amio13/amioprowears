import { ActionButton } from "@/components/admin/ActionButton";
import { Card, Empty, PageHeader } from "@/components/admin/ui";
import { Badge } from "@/components/ui/Badge";
import { buttonClasses } from "@/components/ui/Button";
import { syncUnsyncedSubscribers } from "@/lib/admin/actions/newsletter";
import { requireAdmin } from "@/lib/admin/auth";
import { formatDate } from "@/lib/format";
import type { NewsletterSubscriber } from "@/types";

export const metadata = { title: "Newsletter" };

const SHOWN = 200;

export default async function NewsletterPage() {
  const { supabase } = await requireAdmin();
  const activeCount = async (onlyUnsynced: boolean) => {
    let q = supabase.from("newsletter_subscribers").select("id", { count: "exact", head: true }).eq("is_active", true);
    if (onlyUnsynced) q = q.eq("brevo_synced", false);
    return (await q).count ?? 0;
  };

  const [list, total, unsynced] = await Promise.all([
    supabase.from("newsletter_subscribers").select("*").order("subscribed_at", { ascending: false }).limit(SHOWN).returns<NewsletterSubscriber[]>(),
    activeCount(false),
    activeCount(true),
  ]);
  if (list.error) throw new Error(`Loading subscribers failed: ${list.error.message}`);

  return (
    <>
      <PageHeader
        title="Newsletter"
        description={`${total} subscriber${total === 1 ? "" : "s"}. Send campaigns from the Brevo dashboard.`}
        actions={
          <a href="/admin/newsletter/export" className={buttonClasses({ variant: "secondary" })} download>
            Download CSV
          </a>
        }
      />
      <Card title="Brevo sync" className="mb-4">
        {unsynced === 0 ? (
          <p className="text-sm text-muted">Everyone is in your Brevo list.</p>
        ) : (
          <>
            <p className="mb-3 text-sm">
              {unsynced} subscriber{unsynced === 1 ? " isn't" : "s aren't"} in Brevo yet (Brevo was unreachable when they signed up).
            </p>
            <ActionButton action={syncUnsyncedSubscribers} input={undefined} label="Sync to Brevo" variant="primary" />
          </>
        )}
      </Card>

      {list.data.length === 0 ? (
        <Empty>No subscribers yet.</Empty>
      ) : (
        <>
          <ul className="divide-y divide-line overflow-hidden rounded-2xl bg-white shadow-sm">
            {list.data.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-sm">
                <span className="min-w-0 flex-1 break-all font-medium">{s.email}</span>
                {s.first_name && <span>{s.first_name}</span>}
                <span className="text-muted">
                  {s.source === "checkout" ? "Checkout" : "Footer"} · {formatDate(s.subscribed_at)}
                </span>
                {!s.is_active ? <Badge>Unsubscribed</Badge> : s.brevo_synced ? <Badge tone="success">In Brevo</Badge> : <Badge tone="warning">Not synced</Badge>}
              </li>
            ))}
          </ul>
          {total > SHOWN && <p className="mt-2 text-sm text-muted">Showing the newest {SHOWN}. Download the CSV for everyone.</p>}
        </>
      )}
    </>
  );
}
