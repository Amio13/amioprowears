import { Mail, MapPin, Phone } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { buttonClasses } from "@/components/ui/Button";
import { formatPhoneForDisplay, whatsappLink } from "@/lib/format";
import { SocialIcon } from "@/components/store/SocialIcon";
import { ADDRESS, SOCIALS, STORE } from "@/lib/store-info";

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
            <SocialIcon name="WhatsApp" />
            Chat with us on WhatsApp
          </a>
        </p>
      )}
      <h2>Other ways to reach us</h2>
      <ul className="!list-none !pl-0">
        <li className="flex min-h-11 items-center gap-2">
          <Mail className="size-5 shrink-0" />
          <span>
            Email: <a href={`mailto:${STORE.supportEmail}`}>{STORE.supportEmail}</a>
          </span>
        </li>
        {STORE.supportPhone && (
          <li className="flex min-h-11 items-center gap-2">
            <Phone className="size-5 shrink-0" />
            <span>
              Phone: <a href={`tel:+${STORE.supportPhone}`}>{formatPhoneForDisplay(STORE.supportPhone)}</a>
            </span>
          </li>
        )}
      </ul>
      <h2>Visit our shop</h2>
      <address className="flex gap-2 not-italic">
        <MapPin className="mt-1 size-5 shrink-0" />
        <span>
          {ADDRESS.lines.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
          <a href={ADDRESS.mapUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center">
            Get directions
          </a>
        </span>
      </address>
      <h2>Follow us</h2>
      <p>See new kits and deals as they drop.</p>
      <ul className="!list-none !pl-0">
        {SOCIALS.map((s) => (
          <li key={s.name}>
            <a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2">
              <SocialIcon name={s.name} className="size-5 shrink-0" />
              {s.name} — {s.handle}
            </a>
          </li>
        ))}
      </ul>
      <p>
        About an order? Include your order number (it looks like APW-1047). You can also check its status on the{" "}
        <Link href="/track">track order</Link> page.
      </p>
    </>
  );
}
