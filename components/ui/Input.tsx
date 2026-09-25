import { useId, type ComponentProps } from "react";
import { cn } from "./cn";

export const fieldClasses =
  "block min-h-11 w-full rounded-lg border border-line bg-white px-3 text-base text-ink " +
  "placeholder:text-neutral-400 focus:border-ink focus:outline-none focus-visible:outline-2 " +
  "aria-invalid:border-brand disabled:bg-surface";

type FieldProps = {
  label: string;
  hint?: string;
  error?: string;
  hideLabel?: boolean;
};

/** Labelled text input. Pass `error` to show a message and mark it invalid. */
export function Input({
  label,
  hint,
  error,
  hideLabel,
  className,
  id,
  ...props
}: ComponentProps<"input"> & FieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;

  return (
    <div className={className}>
      <label
        htmlFor={inputId}
        className={cn("mb-1 block text-sm font-medium text-ink", hideLabel && "sr-only")}
      >
        {label}
      </label>
      <input
        id={inputId}
        className={fieldClasses}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...props}
      />
      {error ? (
        <p id={`${inputId}-error`} className="mt-1 text-sm text-brand">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="mt-1 text-sm text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
