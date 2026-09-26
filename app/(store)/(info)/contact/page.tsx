import type { Metadata } from "next";
import Link from "next/link";
import { buttonClasses } from "@/components/ui/Button";
import { formatPhoneForDisplay, whatsappLink } from "@/lib/format";
import { STORE } from "@/lib/store-info";

export const metadata: Metadata = {
  title: "Contact us",
  description: "Questions about a jersey or an order? Chat with us on WhatsApp or send us an email.",
};

export default function ContactPage() {
  return (
    <>
      <h1>Contact us</h1>
      <p>Questions about a jersey, sizing or your order? We&apos;re happy to help.</p>
      {STORE.whatsapp && (
        <p>
          <a
            href={whatsappLink(STORE.whatsapp, `Hi, I need help with an order on ${STORE.name}`)}
            target="_blank"
            rel="noopener noreferrer"
            className={`${buttonClasses({ size: "lg" })} !no-underline bg-whatsapp hover:bg-whatsapp hover:!text-white`}
          >
            Chat with us on WhatsApp
          </a>
        </p>
      )}
      <h2>Other ways to reach us</h2>
      <ul>
        <li>
          Email: <a href={`mailto:${STORE.supportEmail}`}>{STORE.supportEmail}</a>
        </li>
        {STORE.supportPhone && (
          <li>
            Phone: <a href={`tel:+${STORE.supportPhone}`}>{formatPhoneForDisplay(STORE.supportPhone)}</a>
          </li>
        )}
      </ul>
      <p>
        About an order? Include your order number (it looks like APW-1047). You can also check its status on the{" "}
        <Link href="/track">track order</Link> page.
      </p>
    </>
  );
}
