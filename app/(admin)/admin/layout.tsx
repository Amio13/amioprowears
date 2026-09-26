import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s | Admin" },
  robots: { index: false, follow: false },
};

/**
 * Shell for everything under /admin (including the login page). The admin check
 * lives in (panel)/layout.tsx and in every page and action — see lib/admin/auth.ts.
 */
export default function AdminRootLayout({ children }: LayoutProps<"/admin">) {
  return <div className="flex min-h-full flex-1 flex-col bg-surface">{children}</div>;
}
