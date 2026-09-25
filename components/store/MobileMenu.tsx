"use client";

import Link from "next/link";
import { useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { MAIN_NAV } from "./nav-links";

export function MobileMenu() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="-ml-2 inline-flex size-11 items-center justify-center rounded-full hover:bg-surface-strong md:hidden"
        aria-label="Open menu"
        aria-haspopup="dialog"
      >
        <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
        </svg>
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Menu" side="left">
        <nav aria-label="Main">
          <ul className="-mx-2 space-y-1">
            {MAIN_NAV.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="flex min-h-11 items-center rounded-lg px-2 text-lg font-medium hover:bg-surface-strong"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </Sheet>
    </>
  );
}
