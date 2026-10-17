import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * Form field shell: label, optional hint, control and error, wired for a11y
 * with `aria-describedby` and a stable id.
 */
export function Field({
  id,
  label,
  hint,
  error,
  required,
  children,
  className,
  labelAccessory,
}: {
  id?: string;
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  children: ReactNode;
  className?: string;
  labelAccessory?: ReactNode;
}) {
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("space-y-1.5", className)}>
      {label ? (
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor={id}>
            {label}
            {required ? <span className="ms-0.5 text-destructive">*</span> : null}
          </Label>
          {labelAccessory}
        </div>
      ) : null}
      <div aria-describedby={describedBy}>{children}</div>
      {hint && !error ? (
        <p id={`${id}-hint`} className="text-2xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="text-2xs font-medium text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
