import { Mail } from "lucide-react";
import Link from "next/link";
import { Logo } from "./Logo";
import { NewsletterSignup } from "./NewsletterSignup";
import { SocialIcon } from "./SocialIcon";
import { SOCIALS } from "@/lib/store-info";

const LINK_GROUPS = [
  {
    title: "Shop",
    links: [
      { href: "/catalogue", label: "All jerseys" },
      { href: "/track", label: "Track your order" },
    ],
  },
  {
    title: "Help",
    links: [
      { href: "/delivery", label: "Delivery" },
      { href: "/returns", label: "Returns & exchanges" },
      { href: "/contact", label: "Contact us" },
      { href: "/about", label: "About" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy", label: "Privacy policy" },
      { href: "/terms", label: "Terms of service" },
    ],
  },
];

export function Footer() {
  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;

  return (
    <footer className="mt-16 border-t border-line bg-surface">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 md:grid-cols-[1fr_2fr]">
        <div className="space-y-4">
          <Logo />
          <p className="max-w-xs text-sm text-muted">
            Custom football jerseys, delivered to your nearest motor park anywhere in Nigeria.
          </p>
          {supportEmail && (
            <p className="text-sm">
              <a href={`mailto:${supportEmail}`} className="inline-flex items-center gap-2 underline underline-offset-4 hover:text-brand">
                <Mail className="size-4 shrink-0" />
                {supportEmail}
              </a>
            </p>
          )}
          <ul className="-ml-3 flex gap-1" aria-label="Follow us">
            {SOCIALS.map((s) => (
              <li key={s.name}>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${s.name} ${s.handle}`}
                  className="inline-flex size-11 items-center justify-center rounded-full text-muted hover:bg-line hover:text-ink"
                >
                  <SocialIcon name={s.name} />
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-[repeat(3,auto)_minmax(0,1.5fr)]">
          {LINK_GROUPS.map((g) => (
            <nav key={g.title} aria-label={g.title}>
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wide">{g.title}</h2>
              <ul className="space-y-1 text-sm text-muted">
                {g.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="inline-flex min-h-11 items-center hover:text-ink sm:min-h-8">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
          <div className="col-span-2 sm:col-span-1">
            <h2 className="mb-1 text-sm font-bold uppercase tracking-wide">New drops & deals</h2>
            <p className="mb-3 text-sm text-muted">Be first to hear about new kits. No spam.</p>
            <NewsletterSignup />
          </div>
        </div>
      </div>
      <div className="border-t border-line">
        <p className="mx-auto max-w-7xl px-4 py-4 text-xs text-muted">
          © {new Date().getFullYear()} Amioprowears. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
