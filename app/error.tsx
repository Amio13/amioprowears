"use client";

import { House, RotateCcw, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { Button, buttonClasses } from "@/components/ui/Button";

/** Shown when a page fails to load (the "500" page inside the normal layout). */
export default function ErrorPage({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <TriangleAlert className="size-12 text-muted" strokeWidth={1.5} />
      <p className="font-display text-7xl text-brand">Oops</p>
      <h1 className="text-2xl font-bold">Something went wrong on our side</h1>
      <p className="text-muted">Please try again. If it keeps happening, chat with us on WhatsApp or email us.</p>
      <div className="flex flex-wrap justify-center gap-3">
        <Button onClick={() => retry()}>
          <RotateCcw />
          Try again
        </Button>
        <Link href="/" className={buttonClasses({ variant: "secondary" })}>
          <House />
          Back to the store
        </Link>
      </div>
      {error.digest && <p className="text-xs text-muted">Error code: {error.digest}</p>}
    </main>
  );
}
