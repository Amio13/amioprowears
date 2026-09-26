import type { Metadata } from "next";
import Link from "next/link";
import { POLICIES_UPDATED, STORE } from "@/lib/store-info";

export const metadata: Metadata = {
  title: "Terms of service",
  description: "The terms that apply when you buy from Amioprowears.",
};

export default function TermsPage() {
  return (
    <>
      <h1>Terms of service</h1>
      <p className="text-sm text-muted">Last updated {POLICIES_UPDATED}</p>
      <p>
        These terms apply when you use this website or buy from {STORE.name}. By placing an order you agree to them. Please also read our{" "}
        <Link href="/delivery">delivery</Link>, <Link href="/returns">returns</Link> and <Link href="/privacy">privacy</Link> policies, which
        form part of these terms.
      </p>

      <h2>Orders</h2>
      <ul>
        <li>Your order is confirmed once your payment succeeds and we send you a confirmation email.</li>
        <li>
          If we can&apos;t fulfil an order (for example, a size has sold out), we&apos;ll contact you and offer an alternative or a full
          refund.
        </li>
        <li>You must give a correct name, phone number, email and motor park so we can deliver your order.</li>
      </ul>

      <h2>Prices and payment</h2>
      <ul>
        <li>All prices are in Nigerian naira (₦) and include payment processing. Delivery is added at checkout.</li>
        <li>We may change prices at any time, but the price you pay is the one shown at checkout when you order.</li>
        <li>Payments are processed securely by Paystack. Vouchers can&apos;t be exchanged for cash and are subject to their own conditions.</li>
        <li>If a price is clearly wrong because of an error, we may cancel the order and refund you in full.</li>
      </ul>

      <h2>Customisation</h2>
      <ul>
        <li>We print the name and number exactly as you type them. Please check spelling and sizes before paying.</li>
        <li>The preview shows how your jersey will look; small differences in colour and position are normal.</li>
        <li>
          We may refuse to print text that is offensive or infringes someone else&apos;s rights, and refund you if so.
        </li>
      </ul>

      <h2>Delivery and pickup</h2>
      <p>
        We deliver to the motor park you choose. Once the parcel arrives there, it&apos;s your responsibility to collect it promptly. See our{" "}
        <Link href="/delivery">delivery policy</Link> for times, fees and uncollected parcels.
      </p>

      <h2>Returns</h2>
      <p>
        Custom printed jerseys can only be returned if we made a mistake. Plain jerseys can be exchanged under the conditions in our{" "}
        <Link href="/returns">returns policy</Link>.
      </p>

      <h2>Our responsibility</h2>
      <p>
        We&apos;re responsible for delivering the order you paid for as described. We&apos;re not responsible for delays caused by
        logistics companies, motor parks or events outside our control, but we&apos;ll help you sort them out. As far as the law allows,
        our total responsibility for an order is limited to the amount you paid for it. Nothing in these terms limits your rights under
        Nigerian consumer protection law.
      </p>

      <h2>Law</h2>
      <p>These terms are governed by the laws of the Federal Republic of Nigeria.</p>

      <h2>Contact</h2>
      <p>
        Questions about these terms? Email <a href={`mailto:${STORE.supportEmail}`}>{STORE.supportEmail}</a>.
      </p>
    </>
  );
}
