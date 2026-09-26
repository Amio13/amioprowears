import { Baby, Flag, Heart, History, type LucideIcon, Shirt, Trophy, Truck, Venus } from "lucide-react";

export const MAIN_NAV: readonly { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/catalogue", label: "Shop all", icon: Shirt },
  { href: "/catalogue?collection=top-clubs", label: "Top clubs", icon: Trophy },
  { href: "/catalogue?collection=national-teams", label: "National teams", icon: Flag },
  { href: "/catalogue?collection=female-kits", label: "Females", icon: Venus },
  { href: "/catalogue?collection=kids", label: "Kids", icon: Baby },
  { href: "/catalogue?collection=vintage", label: "Vintage", icon: History },
  { href: "/track", label: "Track order", icon: Truck },
];

/** Extra links in the phone menu (the header shows these as icons). */
export const MOBILE_EXTRA_NAV: readonly { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/favourites", label: "Favourites", icon: Heart },
];
