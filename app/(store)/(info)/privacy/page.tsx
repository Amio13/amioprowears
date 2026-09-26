import type { Metadata } from "next";
import { ADDRESS, POLICIES_UPDATED, STORE } from "@/lib/store-info";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "How Amioprowears collects, uses and protects your personal data under the Nigeria Data Protection Act 2023.",
};

export default function PrivacyPage() {
  const email = <a href={`mailto:${STORE.supportEmail}`}>{STORE.supportEmail}</a>;
  return (
    <>
      <h1>Privacy policy</h1>
      <p className="text-sm text-muted">Last updated {POLICIES_UPDATED}</p>
      <p>
        This policy explains what personal data {STORE.name} (&quot;we&quot;, &quot;us&quot;) collects when you use {STORE.siteUrl.replace(/^https?:\/\//, "")},
        why, and your rights. We follow the Nigeria Data Protection Act 2023 (NDPA). {STORE.name} is the data controller. Contact us about
        your data at {email}, or write to us at {ADDRESS.lines.slice(1).join(", ")}.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>When you order:</strong> your name, phone number(s), email address, state, city and chosen motor park, any order notes,
          and what you ordered (including the name and number you want printed).
        </li>
        <li>
          <strong>Payments:</strong> handled by Paystack. We never see or store your full card details — we only receive the payment
          reference, amount and status.
        </li>
        <li>
          <strong>Newsletter:</strong> your email address and, if you give it, your first name.
        </li>
        <li>
          <strong>When you contact us:</strong> what you send us by email or WhatsApp.
        </li>
      </ul>

      <h2>Why we use it (and our legal basis)</h2>
      <ul>
        <li>
          To process, print, deliver and support your order, and send you order emails — needed to perform our contract with you.
        </li>
        <li>To keep records for tax, accounting and fraud prevention — our legal obligations and legitimate interests.</li>
        <li>To send our newsletter — only with your consent, which you can withdraw at any time using the unsubscribe link.</li>
      </ul>
      <p>We don&apos;t sell your personal data, and we don&apos;t use it for automated decisions about you.</p>

      <h2>Who we share it with</h2>
      <p>We share only what each service needs to do its job for us:</p>
      <ul>
        <li>Paystack — to take payments.</li>
        <li>The logistics company carrying your parcel — your name, phone number and motor park.</li>
        <li>Supabase — stores our order database.</li>
        <li>Cloudflare — hosts this website.</li>
        <li>Brevo — sends order emails and the newsletter.</li>
        <li>Telegram and Zoho Mail — alert us to new orders and handle our email.</li>
        <li>WhatsApp (Meta) — if you chat with us there.</li>
      </ul>
      <p>
        Some of these providers store data outside Nigeria. Where they do, we rely on the safeguards the NDPA allows, such as the
        providers&apos; data protection terms. We may also share data if the law requires it.
      </p>

      <h2>How long we keep it</h2>
      <ul>
        <li>Order and payment records: up to 6 years, for tax and accounting.</li>
        <li>Newsletter details: until you unsubscribe.</li>
        <li>Messages to us: as long as needed to help you, then deleted.</li>
      </ul>

      <h2>Cookies and storage</h2>
      <p>
        We don&apos;t use advertising or tracking cookies. Your cart and favourites are saved in your browser&apos;s local storage so
        they&apos;re still there when you come back. They stay on your device and aren&apos;t sent to us until you check out. Our payment provider may set cookies needed to take your payment securely.
      </p>

      <h2>Your rights</h2>
      <p>Under the NDPA you can:</p>
      <ul>
        <li>ask for a copy of the personal data we hold about you;</li>
        <li>ask us to correct it or delete it (unless we must keep it by law);</li>
        <li>object to or ask us to limit how we use it;</li>
        <li>ask for your data in a portable format;</li>
        <li>withdraw consent to the newsletter at any time.</li>
      </ul>
      <p>
        Email {email} and we&apos;ll reply within 30 days. If you&apos;re unhappy with how we handle your data, you can complain to the
        Nigeria Data Protection Commission (NDPC).
      </p>

      <h2>Security</h2>
      <p>
        We use encrypted connections (HTTPS), limit access to your data to the people who need it, and use providers with strong security
        practices. No system is perfectly secure, but we&apos;ll tell you and the NDPC if a breach puts your data at risk, as the law requires.
      </p>

      <h2>Children</h2>
      <p>Our store is for adults. If you&apos;re under 18, please ask a parent or guardian to order for you.</p>

      <h2>Changes</h2>
      <p>We may update this policy. The date at the top shows when it last changed.</p>
    </>
  );
}
