"use client";

import { Award, ChartColumn, ClipboardList, ExternalLink, House, LayoutDashboard, LogOut, Mail, Menu, Settings, Shirt, Ticket } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/components/ui/cn";
import { Sheet } from "@/components/ui/Sheet";
import { signOut } from "@/lib/admin/actions/auth";

const LINKS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/orders", label: "Orders", icon: ClipboardList },
  { href: "/admin/products", label: "Products", icon: Shirt },
  { href: "/admin/homepage", label: "Homepage", icon: House },
  { href: "/admin/badges", label: "Badges", icon: Award },
  { href: "/admin/vouchers", label: "Vouchers", icon: Ticket },
  { href: "/admin/newsletter", label: "Newsletter", icon: Mail },
  { href: "/admin/analytics", label: "Analytics", icon: ChartColumn },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

function NavLinks({ onNavigate, email }: { onNavigate?: () => void; email: string }) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/admin" ? pathname === href : pathname.startsWith(href));
  return (
    <nav aria-label="Admin" className="flex h-full flex-col">
      <ul className="space-y-1">
        {LINKS.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              onClick={onNavigate}
              aria-current={isActive(l.href) ? "page" : undefined}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-lg px-3 font-medium hover:bg-surface-strong",
                isActive(l.href) && "bg-surface-strong text-brand",
              )}
            >
              <l.icon className="size-5 shrink-0" />
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
      <div className="mt-6 space-y-1 border-t border-line pt-4 text-sm">
        <a href="/" target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center gap-3 rounded-lg px-3 hover:bg-surface-strong">
          <ExternalLink className="size-5 shrink-0" />
          View store
        </a>
        <form action={signOut}>
          <button type="submit" className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left hover:bg-surface-strong">
            <LogOut className="size-5 shrink-0" />
            Log out
          </button>
        </form>
        <p className="truncate px-3 pt-2 text-xs text-muted">{email}</p>
      </div>
    </nav>
  );
}

/** Phone: top bar + slide-in menu. Desktop: fixed sidebar. Hidden when printing. */
export function AdminNav({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  const title = (
    <span className="font-display text-2xl leading-none tracking-wide">
      <span className="text-brand">AMIO</span>ADMIN
    </span>
  );
  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-line bg-white px-2 md:hidden print:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex size-11 items-center justify-center rounded-full hover:bg-surface-strong"
          aria-label="Open admin menu"
          aria-haspopup="dialog"
        >
          <Menu className="size-6" />
        </button>
        <Link href="/admin">{title}</Link>
      </header>
      <Sheet open={open} onClose={() => setOpen(false)} title="Admin menu" side="left">
        <NavLinks email={email} onNavigate={() => setOpen(false)} />
      </Sheet>
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-line bg-white p-4 md:flex print:hidden">
        <Link href="/admin" className="mb-6 px-3">
          {title}
        </Link>
        <NavLinks email={email} />
      </aside>
    </>
  );
}
