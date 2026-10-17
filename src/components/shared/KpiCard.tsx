import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { AnimatedNumber } from "@/components/shared/AnimatedNumber";
import { SimpleTooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type ValueFormat = "int" | "money" | "percent";

export type KpiCardProps = {
  label: string;
  value: number | null | undefined;
  hint?: string;
  icon?: LucideIcon;
  format?: ValueFormat;
  currency?: string | null;
  compact?: boolean;
  /** Semantics of the accent: neutral, positive or negative. */
  tone?: "neutral" | "positive" | "negative" | "warning" | "accent";
  /** A short delta line, e.g. "+12% MoM". */
  delta?: { value: string; direction: "up" | "down" | "flat"; positiveIsGood?: boolean };
  footer?: ReactNode;
  className?: string;
};

const toneClasses: Record<NonNullable<KpiCardProps["tone"]>, string> = {
  neutral: "text-foreground",
  positive: "text-positive",
  negative: "text-negative",
  warning: "text-status-expiring",
  accent: "text-primary",
};

export function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  format = "int",
  currency,
  compact,
  tone = "neutral",
  delta,
  footer,
  className,
}: KpiCardProps) {
  const card = (
    <div
      className={cn(
        "group relative flex flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-xs transition-shadow hover:shadow-sm",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-xs font-medium text-muted-foreground">{label}</span>
        {Icon ? (
          <span className="flex size-7 items-center justify-center rounded-md bg-muted text-muted-foreground transition-colors group-hover:text-foreground">
            <Icon className="size-3.5" />
          </span>
        ) : null}
      </div>

      <div className="flex items-baseline gap-2">
        <span className={cn("text-3xl font-semibold tracking-tight", toneClasses[tone])}>
          <AnimatedNumber value={value} format={format} currency={currency} compact={compact} />
        </span>
        {delta ? (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-xs font-medium",
              delta.direction === "flat"
                ? "text-muted-foreground"
                : (delta.positiveIsGood ?? true) === (delta.direction === "up")
                  ? "text-positive"
                  : "text-negative"
            )}
          >
            {delta.direction === "up" ? (
              <ArrowUpRight className="size-3.5" />
            ) : delta.direction === "down" ? (
              <ArrowDownRight className="size-3.5" />
            ) : null}
            {delta.value}
          </span>
        ) : null}
      </div>

      {footer ?? (hint ? <p className="text-2xs text-muted-foreground">{hint}</p> : null)}
    </div>
  );

  return hint ? (
    <SimpleTooltip content={hint} side="top">
      {card}
    </SimpleTooltip>
  ) : (
    card
  );
}
