import { whatsappLink } from "@/lib/format";

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
      <svg viewBox="0 0 24 24" className="size-8" aria-hidden="true">
        <path
          d="M12 2.5a9.5 9.5 0 0 0-8.2 14.3L2.5 21.5l4.8-1.3A9.5 9.5 0 1 0 12 2.5Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          transform="translate(6.6 6.6) scale(0.45)"
          fill="currentColor"
          d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"
        />
      </svg>
    </a>
  );
}
