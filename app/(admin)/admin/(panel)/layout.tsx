import { AdminNav } from "@/components/admin/AdminNav";
import { SessionKeeper } from "@/components/admin/SessionKeeper";
import { requireAdmin } from "@/lib/admin/auth";

/**
 * Server-side admin guard (no middleware — see CLAUDE.md). Layouts don't re-run on
 * every client navigation, so each page and server action ALSO calls
 * requireAdmin()/adminAction(); Row Level Security is the last line of defence.
 */
export default async function AdminPanelLayout({ children }: LayoutProps<"/admin">) {
  const { user } = await requireAdmin();
  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <AdminNav email={user.email ?? ""} />
      <main id="main" className="min-w-0 flex-1 px-4 py-5 md:px-8 md:py-8 print:p-0">
        {children}
      </main>
      <SessionKeeper />
    </div>
  );
}
