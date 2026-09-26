import Image from "next/image";
import { BadgeForm } from "@/components/admin/BadgeForm";
import { Card, Empty, PageHeader } from "@/components/admin/ui";
import { Badge as Pill } from "@/components/ui/Badge";
import { requireAdmin } from "@/lib/admin/auth";
import { loadAllBadges } from "@/lib/admin/catalogue";
import { BADGE_POSITION_LABELS } from "@/lib/admin/labels";
import { formatNaira } from "@/lib/format";

export const metadata = { title: "Badges" };

export default async function BadgesPage() {
  const { supabase } = await requireAdmin();
  const badges = await loadAllBadges(supabase);

  return (
    <>
      <PageHeader title="Badges" description="Patches customers can add. Choose which jerseys allow each badge on the jersey's page." />
      <Card title="Add a badge" className="mb-4">
        <BadgeForm />
      </Card>
      {badges.length === 0 ? (
        <Empty>No badges yet.</Empty>
      ) : (
        <ul className="space-y-3">
          {badges.map((b) => (
            <li key={b.id} className="rounded-2xl bg-white shadow-sm">
              <details>
                <summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 p-3">
                  <Image src={b.image_url} alt="" width={48} height={48} className="size-12 object-contain" unoptimized />
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold">{b.name}</span>
                    <span className="text-sm text-muted">
                      {BADGE_POSITION_LABELS[b.position]} · {formatNaira(b.price)}
                    </span>
                  </span>
                  {!b.is_active && <Pill>Hidden</Pill>}
                  <span className="text-sm font-medium underline">Edit</span>
                </summary>
                <div className="border-t border-line p-4">
                  <BadgeForm badge={b} />
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
