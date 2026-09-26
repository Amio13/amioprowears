import { getStoreSettings } from "@/lib/products";

/** Thin bar above the header: the admin's announcement, or a notice when the store is closed. */
export async function AnnouncementBar() {
  const { announcement, store_open } = await getStoreSettings();
  const text = !store_open ? (announcement || "We're not taking orders right now. You can still browse — check back soon!") : announcement;
  if (!text) return null;
  return <div className="bg-ink px-4 py-2 text-center text-sm font-medium text-white">{text}</div>;
}
