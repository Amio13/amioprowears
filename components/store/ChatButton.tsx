import { whatsappLink } from "@/lib/format";
import { SocialIcon } from "./SocialIcon";

/**
 * Floating click-to-chat button (free — just a wa.me link, no API).
 * Sits above the mobile sticky "Add to cart" bar: product pages set
 * --sticky-bar-height on a parent so the two never overlap.
 */
export function ChatButton({
  message = "Hi, I need help with an order on Amioprowears",
}: {
  message?: string;
}) {
  const number = process.env.NEXT_PUBLIC_WHATSAPP_CHAT_NUMBER;
  if (!number || !/^234\d{10}$/.test(number)) return null;

  return (
    <a
      href={whatsappLink(number, message)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      className="fixed right-4 z-40 flex size-14 items-center justify-center rounded-full bg-whatsapp text-white shadow-lg ring-1 ring-black/10 transition-transform hover:scale-105"
      style={{
        bottom: "calc(1rem + env(safe-area-inset-bottom) + var(--sticky-bar-height, 0px))",
      }}
    >
      <SocialIcon name="WhatsApp" className="size-8" />
    </a>
  );
}
