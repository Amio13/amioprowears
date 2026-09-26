import type { Metadata } from "next";
import Link from "next/link";
import { DELIVERY_ZONES, type DeliveryZoneId } from "@/lib/delivery-zones";
import { formatNaira } from "@/lib/format";
import { PICKUP_TEXT } from "@/lib/notify/templates";
import { getDeliveryFees } from "@/lib/products";
import { POLICIES_UPDATED, POLICY } from "@/lib/store-info";

export const metadata: Metadata = {
  title: "Delivery",
  description: "We deliver to the motor park nearest to you, anywhere in Nigeria. Delivery fees by state and how pickup works.",
};

// Fees come from admin → Settings; saving there refreshes this page straight away.
export const revalidate = 300;

export default async function DeliveryPage() {
  const fees = await getDeliveryFees();
  return (
    <>
      <h1>Delivery</h1>
      <p className="text-sm text-muted">Last updated {POLICIES_UPDATED}</p>
      <p>
        We send every order to the <strong>motor park you choose</strong> at checkout, anywhere in Nigeria. We don&apos;t deliver to
        homes or offices — motor park pickup keeps delivery fast and affordable.
      </p>

      <h2>How long it takes</h2>
      <ul>
        <li>
          We print, pack and dispatch your order within <strong>{POLICY.dispatchDays}</strong> after payment.
        </li>
        <li>
          It then usually reaches the motor park within <strong>{POLICY.transitDays}</strong>, depending on your state.
        </li>
        <li>We email you when your order is on its way, with the logistics company&apos;s details when we have them.</li>
      </ul>
      <p>
        You can check your order any time on the <Link href="/track">track order</Link> page with your order number and phone number.
      </p>

      <h2>Delivery fees</h2>
      <p>One fee per order, however many jerseys you buy. It&apos;s shown at checkout before you pay.</p>
      <div className="mt-4 space-y-4">
        {(Object.keys(DELIVERY_ZONES) as DeliveryZoneId[]).map((zone) => (
          <div key={zone} className="rounded-2xl bg-surface p-4">
            <p className="font-bold">
              Zone {zone} — {formatNaira(fees[zone])}
            </p>
            <p className="!mt-1 text-sm text-muted">{DELIVERY_ZONES[zone].states.join(", ")}</p>
          </div>
        ))}
      </div>

      <h2>Picking up your order</h2>
      <p>{PICKUP_TEXT}</p>
      <p>
        Please collect your parcel promptly. Motor parks may charge a storage fee or send back parcels that aren&apos;t collected. If a
        parcel comes back to us because it wasn&apos;t collected, we&apos;ll send it again once you pay the new delivery fee.
      </p>
      <p>
        If your parcel is lost or damaged on the way, before you collect it, we&apos;ll send a replacement or give you a full refund — we
        sort it out with the logistics company, not you.
      </p>
      <p>
        Please make sure your phone number and motor park are correct at checkout. If you spot a mistake, <Link href="/contact">contact us</Link>{" "}
        straight away — before we dispatch, we can change it at no cost.
      </p>
    </>
  );
}
