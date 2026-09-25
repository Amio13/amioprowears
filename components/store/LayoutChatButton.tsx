"use client";

import { usePathname } from "next/navigation";
import { ChatButton } from "./ChatButton";

/**
 * The store-wide chat button. Product pages render their own instead, pre-filled
 * with the jersey name and lifted above the sticky "Add to cart" bar.
 */
export function LayoutChatButton() {
  const pathname = usePathname();
  if (pathname.startsWith("/jersey/")) return null;
  return <ChatButton />;
}
