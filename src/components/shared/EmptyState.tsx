import type { ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils";

/** The calm, consistent empty state used across every page. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  className,
  compact,
}: {
  icon?: ElementType;
  title: string;
  description?: string;
  action?: ReactNode;
  secondaryAction?: ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 text-center",
        compact ? "px-6 py-10" : "px-6 py-16",
        className
      )}
    >
      {Icon ? (
        <div className="flex size-11 items-center justify-center rounded-xl border border-border bg-subtle text-muted-foreground">
          <Icon className="size-5" />
        </div>
      ) : null}
      <div className="max-w-sm space-y-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {description ? <p className="text-pretty text-xs text-muted-foreground">{description}</p> : null}
      </div>
      {action || secondaryAction ? (
        <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
          {action}
          {secondaryAction}
        </div>
      ) : null}
    </div>
  );
}
