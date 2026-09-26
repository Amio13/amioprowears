import { Heart, History, type LucideIcon, Shirt, Sparkles, Star, Truck } from "lucide-react";

export const MAIN_NAV: readonly { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/catalogue", label: "Shop all", icon: Shirt },
  { href: "/catalogue?collection=new-arrivals", label: "New arrivals", icon: Sparkles },
  { href: "/catalogue?collection=super-eagles", label: "Super Eagles", icon: Star },
  { href: "/catalogue?collection=vintage", label: "Vintage", icon: History },
  { href: "/track", label: "Track order", icon: Truck },
];

/** Extra links in the phone menu (the header shows these as icons). */
export const MOBILE_EXTRA_NAV: readonly { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/favourites", label: "Favourites", icon: Heart },
];
