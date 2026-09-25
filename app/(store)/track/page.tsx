import type { Metadata } from "next";
import { Suspense } from "react";
import { TrackOrder } from "@/components/store/TrackOrder";

export const metadata: Metadata = {
  title: "Track your order",
  description: "Check the status of your Amioprowears order with your order number and phone number.",
};

export default function TrackPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-8 md:py-12">
      <h1 className="font-display text-5xl leading-none tracking-wide">Track your order</h1>
      <p className="mt-2 text-muted">Enter your order number and the phone number you used at checkout.</p>
      <Suspense>
        <TrackOrder />
      </Suspense>
    </div>
  );
}
