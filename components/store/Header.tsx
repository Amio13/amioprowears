import Link from "next/link";
import { CartLink } from "./CartLink";
import { Logo } from "./Logo";
import { MobileMenu } from "./MobileMenu";
import { MAIN_NAV } from "./nav-links";

export function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-4 md:gap-8">
        <MobileMenu />
        <Logo className="flex-1 text-center md:flex-none md:text-left" />
        <nav aria-label="Main" className="hidden flex-1 md:block">
          <ul className="flex gap-6 text-sm font-medium">
            {MAIN_NAV.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="py-2 hover:text-brand">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <CartLink />
      </div>
    </header>
  );
}
