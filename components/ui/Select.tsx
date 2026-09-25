import { useId, type ComponentProps } from "react";
import { cn } from "./cn";
import { fieldClasses } from "./Input";

type SelectProps = ComponentProps<"select"> & {
  label: string;
  error?: string;
  hideLabel?: boolean;
  placeholder?: string;
  options: readonly (string | { value: string; label: string })[];
};

export function Select({
  label,
  error,
  hideLabel,
  placeholder,
  options,
  className,
  id,
  ...props
}: SelectProps) {
  const autoId = useId();
  const selectId = id ?? autoId;

  return (
    <div className={className}>
      <label
        htmlFor={selectId}
        className={cn("mb-1 block text-sm font-medium text-ink", hideLabel && "sr-only")}
      >
        {label}
      </label>
      <select
        id={selectId}
        className={cn(fieldClasses, "appearance-auto")}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${selectId}-error` : undefined}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => {
          const { value, label } = typeof o === "string" ? { value: o, label: o } : o;
          return (
            <option key={value} value={value}>
              {label}
            </option>
          );
        })}
      </select>
      {error && (
        <p id={`${selectId}-error`} className="mt-1 text-sm text-brand">
          {error}
        </p>
      )}
    </div>
  );
}
