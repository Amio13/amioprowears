import { LoaderCircle } from "lucide-react";
import { cn } from "./cn";

export function Spinner({ className, label }: { className?: string; label?: string }) {
  return (
    <span role={label ? "status" : undefined} className="inline-flex">
      <LoaderCircle className={cn("size-5 animate-spin", className)} strokeWidth={2.5} />
      {label && <span className="sr-only">{label}</span>}
    </span>
  );
}
