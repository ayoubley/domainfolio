import { animate, useInView, useMotionValue, useTransform, motion } from "framer-motion";
import { useEffect, useRef } from "react";
import { money, percent } from "@/lib/format";
import { cn } from "@/lib/utils";

type Format = "int" | "money" | "percent";

/**
 * A number that counts up to its target on first view. Values without a
 * transition (very large jumps, non-finite) render instantly so the KPI grid
 * never looks like a slot machine.
 */
export function AnimatedNumber({
  value,
  format = "int",
  currency,
  compact = false,
  duration = 0.7,
  className,
}: {
  value: number | null | undefined;
  format?: Format;
  currency?: string | null;
  compact?: boolean;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const motionValue = useMotionValue(0);

  const rendered = useTransform(motionValue, latest => {
    if (format === "money") return money(latest, { currency, compact });
    if (format === "percent") return percent(latest);
    return new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 0,
      notation: compact ? "compact" : "standard",
    }).format(latest);
  });

  useEffect(() => {
    if (!inView || value === null || value === undefined || !Number.isFinite(value)) return;
    const controls = animate(motionValue, value, { duration, ease: [0.16, 1, 0.3, 1] });
    return () => controls.stop();
  }, [inView, value, duration, motionValue]);

  if (value === null || value === undefined || !Number.isFinite(value)) {
    return (
      <span ref={ref} className={cn("tabular", className)}>
        {format === "money" ? money(null) : format === "percent" ? percent(null) : "0"}
      </span>
    );
  }

  return (
    <motion.span ref={ref} className={cn("tabular", className)}>
      {rendered}
    </motion.span>
  );
}
