"use client";

import { useState, useTransition, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import type { ActionResult } from "@/lib/admin/action";
import { FormMessage } from "./ui";

/** A button that runs one server action (e.g. "Mark as refunded"), with optional confirm. */
export function ActionButton<I>({
  action,
  input,
  label,
  icon,
  confirm,
  variant = "secondary",
  className,
}: {
  action: (input: I) => Promise<ActionResult<unknown>>;
  input: I;
  label: string;
  /** e.g. <RefreshCw /> — sized by the button. */
  icon?: ReactNode;
  confirm?: string;
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionResult<unknown> | null>(null);
  return (
    <div className={className}>
      <Button
        variant={variant}
        loading={pending}
        onClick={() => {
          if (confirm && !window.confirm(confirm)) return;
          startTransition(async () => setResult(await action(input)));
        }}
      >
        {!pending && icon}
        {label}
      </Button>
      <div className="mt-1">
        <FormMessage result={result} />
      </div>
    </div>
  );
}
