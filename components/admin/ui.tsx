import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useId, type ComponentProps, type ReactNode } from "react";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/components/ui/cn";
import { fieldClasses } from "@/components/ui/Input";
import { ORDER_STATUS, PAYMENT_STATUS } from "@/lib/admin/labels";
import type { OrderStatus, PaymentStatus } from "@/types";

/** "← Orders" style link above a page title. */
export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="mb-2 inline-flex min-h-11 items-center gap-1.5 text-sm text-muted hover:text-ink print:hidden">
      <ArrowLeft className="size-4" />
      {children}
    </Link>
  );
}

/** Page title with optional actions on the right (wraps under on phones). */
export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3 print:hidden">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ title, actions, className, children }: { title?: string; actions?: ReactNode; className?: string; children: ReactNode }) {
  return (
    <section className={cn("rounded-2xl bg-white p-4 shadow-sm md:p-5", className)}>
      {(title || actions) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          {title && <h2 className="text-base font-bold">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const s = ORDER_STATUS[status];
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const s = PAYMENT_STATUS[status];
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

export function Textarea({ label, hint, error, className, id, ...props }: ComponentProps<"textarea"> & { label: string; hint?: string; error?: string }) {
  const autoId = useId();
  const tid = id ?? autoId;
  return (
    <div className={className}>
      <label htmlFor={tid} className="mb-1 block text-sm font-medium">
        {label}
      </label>
      <textarea id={tid} className={cn(fieldClasses, "min-h-24 py-2")} aria-invalid={error ? true : undefined} {...props} />
      {error ? <p className="mt-1 text-sm text-brand">{error}</p> : hint ? <p className="mt-1 text-sm text-muted">{hint}</p> : null}
    </div>
  );
}

/** Checkbox with a 44px tap target. */
export function Checkbox({ label, hint, className, ...props }: Omit<ComponentProps<"input">, "type"> & { label: ReactNode; hint?: string }) {
  return (
    <label className={cn("flex min-h-11 cursor-pointer items-start gap-3 py-2", className)}>
      <input type="checkbox" className="mt-0.5 size-5 shrink-0 accent-[var(--color-brand)]" {...props} />
      <span className="text-sm">
        <span className="font-medium">{label}</span>
        {hint && <span className="block text-muted">{hint}</span>}
      </span>
    </label>
  );
}

/** Success / error line under a form. */
export function FormMessage({ result }: { result: { ok: true; message?: string } | { ok: false; error: string } | null }) {
  if (!result) return null;
  if (result.ok) return result.message ? <p role="status" className="text-sm font-medium text-green-700">{result.message}</p> : null;
  return (
    <p role="alert" className="text-sm font-medium text-brand">
      {result.error}
    </p>
  );
}

/** Empty-state message inside lists. */
export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-2xl bg-white p-6 text-center text-sm text-muted shadow-sm">{children}</p>;
}
