import { Megaphone, Store } from "lucide-react";
import { getStoreSettings } from "@/lib/products";

/** Thin bar above the header: the admin's announcement, or a notice when the store is closed. */
export async function AnnouncementBar() {
  const { announcement, store_open } = await getStoreSettings();
  const text = !store_open ? (announcement || "We're not taking orders right now. You can still browse — check back soon!") : announcement;
  if (!text) return null;
  const Icon = store_open ? Megaphone : Store;
  return (
    <div className="flex items-center justify-center gap-2 bg-ink px-4 py-2 text-center text-sm font-medium text-white">
      <Icon className="size-4 shrink-0" />
      <span>{text}</span>
    </div>
  );
}
