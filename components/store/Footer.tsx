import { Mail, MapPin, Send } from "lucide-react";
import Link from "next/link";
import { Logo } from "./Logo";
import { NewsletterSignup } from "./NewsletterSignup";
import { SocialIcon } from "./SocialIcon";
import { ADDRESS, SOCIALS } from "@/lib/store-info";

const LINK_GROUPS = [
  {
    title: "Shop",
    links: [
      { href: "/catalogue", label: "All jerseys" },
      { href: "/favourites", label: "Your favourites" },
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
      {/* Newsletter first, as its own band, so it's the first thing seen at the bottom of every page. */}
      <section aria-labelledby="newsletter-heading" className="border-b border-line">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 md:grid-cols-2 md:items-center md:gap-12">
          <div>
            <h2 id="newsletter-heading" className="flex items-center gap-2 font-display text-3xl leading-none tracking-wide md:text-4xl">
              <Send className="size-6 shrink-0 text-brand" />
              New drops & deals
            </h2>
            <p className="mt-2 text-sm text-muted">Be first to hear about new kits and offers. No spam, unsubscribe any time.</p>
          </div>
          <NewsletterSignup />
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 md:grid-cols-[1fr_2fr]">
        <div className="space-y-4">
          <Logo />
          <p className="max-w-xs text-sm text-muted">
            Custom football jerseys, delivered to your nearest motor park anywhere in Nigeria.
          </p>
          <address className="flex gap-2 text-sm not-italic">
            <MapPin className="mt-0.5 size-4 shrink-0" />
            <span>
              {ADDRESS.lines.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
              <a
                href={ADDRESS.mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center underline underline-offset-4 hover:text-brand sm:min-h-8"
              >
                Get directions
              </a>
            </span>
          </address>
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

        <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3">
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
