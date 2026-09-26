import Link from "next/link";
import { CartLink, FavouritesLink } from "./CartLink";
import { Logo } from "./Logo";
import { MobileMenu } from "./MobileMenu";
import { MAIN_NAV } from "./nav-links";

export function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-4 lg:gap-8">
        <MobileMenu />
        <Logo className="flex-1 justify-center lg:flex-none lg:justify-start" imageClassName="h-12" priority />
        <nav aria-label="Main" className="hidden flex-1 lg:block">
          <ul className="flex gap-6 whitespace-nowrap text-sm font-medium">
            {MAIN_NAV.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="py-2 hover:text-brand">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="-mr-2 flex items-center">
          <FavouritesLink />
          <CartLink />
        </div>
      </div>
    </header>
  );
}
