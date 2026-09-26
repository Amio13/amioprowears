import type { Metadata } from "next";
import Link from "next/link";
import { POLICIES_UPDATED, POLICY } from "@/lib/store-info";

export const metadata: Metadata = {
  title: "Returns & exchanges",
  description: "Our returns and exchange policy for custom and plain football jerseys.",
};

export default function ReturnsPage() {
  return (
    <>
      <h1>Returns &amp; exchanges</h1>
      <p className="text-sm text-muted">Last updated {POLICIES_UPDATED}</p>

      <h2>If we made a mistake, or your parcel is lost</h2>
      <p>
        If you receive the wrong jersey, the wrong size, a misprinted name or number, or a damaged item, we&apos;ll make it right at no
        cost to you — a replacement, or a full refund if we can&apos;t replace it. We pay the delivery both ways.
      </p>
      <p>
        Please <Link href="/contact">contact us</Link> within <strong>{POLICY.exchangeWindow} of picking up</strong> your order, with your
        order number and clear photos of the problem.
      </p>
      <p>
        If your parcel is lost or damaged before you collect it from the motor park, just let us know and we&apos;ll send a replacement or refund you in full.
      </p>

      <h2>Custom (printed) jerseys</h2>
      <p>
        Jerseys printed with a name, number or badge are made just for you, so we can&apos;t take them back or exchange them for a change of
        mind or the wrong size. Please check your size, spelling and number carefully before you pay — we print exactly what you type.
        This doesn&apos;t affect your rights if we made a mistake (see above).
      </p>

      <h2>Plain jerseys</h2>
      <p>
        You can exchange a plain (unprinted) jersey for a different size or jersey within <strong>{POLICY.exchangeWindow} of picking it up</strong>,
        if it is unworn, unwashed and in its original packaging with tags on.
      </p>
      <ul>
        <li>Contact us within {POLICY.exchangeWindow} with your order number and what you&apos;d like instead.</li>
        <li>You pay the delivery to send it back and to receive the new one.</li>
        <li>If the new jersey costs more, you pay the difference; if it costs less, we refund the difference.</li>
        <li>Exchanges depend on stock. If what you want isn&apos;t available, we&apos;ll refund the jersey price (not delivery).</li>
      </ul>

      <h2>Refunds</h2>
      <p>
        Refunds go back to the card or account you paid with through Paystack. We start an approved refund within{" "}
        <strong>{POLICY.refundStart}</strong>; your bank usually shows it within {POLICY.refundBank} after that.
      </p>

      <h2>Cancelling an order</h2>
      <p>
        You can cancel any order for a full refund within <strong>{POLICY.cancelWindow} of paying</strong>. Message us on WhatsApp or{" "}
        <Link href="/contact">contact us</Link> with your order number — the time we receive your message counts. After{" "}
        {POLICY.cancelWindow} we may already be preparing your order, so it can&apos;t be cancelled.
      </p>
    </>
  );
}
