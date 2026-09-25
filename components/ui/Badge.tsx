import type { ReactNode } from "react";
import { cn } from "./cn";

type Tone = "neutral" | "brand" | "success";

const tones: Record<Tone, string> = {
  neutral: "bg-surface-strong text-ink",
  brand: "bg-brand text-white",
  success: "bg-green-100 text-green-800",
};

/** Small label pill, e.g. "Sale", "New", order status. */
export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
