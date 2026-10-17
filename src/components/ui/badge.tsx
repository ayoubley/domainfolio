import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border border-transparent px-2 py-0.5 text-xs font-medium leading-5 transition-colors [&_svg]:size-3",
  {
    variants: {
      variant: {
        neutral: "bg-muted text-muted-foreground",
        outline: "border-border-strong text-muted-foreground",
        primary: "bg-primary-soft text-primary",
        active: "bg-status-active-soft text-status-active",
        listed: "bg-status-listed-soft text-status-listed",
        sold: "bg-status-sold-soft text-status-sold",
        expired: "bg-status-expired-soft text-status-expired",
        expiring: "bg-status-expiring-soft text-status-expiring",
        positive: "bg-status-active-soft text-positive",
        negative: "bg-status-expired-soft text-negative",
        warning: "bg-status-expiring-soft text-status-expiring",
      },
    },
    defaultVariants: { variant: "neutral" },
  }
);

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>;

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { badgeVariants };
