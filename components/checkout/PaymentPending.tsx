"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Spinner } from "@/components/ui/Spinner";

const INTERVAL_MS = 3000;
const MAX_TRIES = 20; // ~1 minute, then we ask them to refresh later

/** Polls /api/payments/verify while the provider is still processing, then reloads the page. */
export function PaymentPending({ reference }: { reference: string }) {
  const router = useRouter();
  const [gaveUp, setGaveUp] = useState(false);

  useEffect(() => {
    let tries = 0;
    const timer = setInterval(async () => {
      tries++;
      try {
        const res = await fetch(`/api/payments/verify?reference=${encodeURIComponent(reference)}`);
        const { status } = await res.json();
        if (status !== "pending") {
          clearInterval(timer);
          router.refresh();
          return;
        }
      } catch {
        // offline for a moment — keep trying
      }
      if (tries >= MAX_TRIES) {
        clearInterval(timer);
        setGaveUp(true);
      }
    }, INTERVAL_MS);
    return () => clearInterval(timer);
  }, [reference, router]);

  return gaveUp ? (
    <p className="text-sm text-muted">
      This is taking longer than usual. You can close this page — we&apos;ll email you as soon as the payment is
      confirmed.
    </p>
  ) : (
    <p className="flex items-center gap-2 text-sm text-muted">
      <Spinner className="size-4" /> Checking with the bank…
    </p>
  );
}
