import { cva, type VariantProps } from "class-variance-authority";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { forwardRef } from "react";
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative flex w-full gap-3 rounded-lg border p-3.5 text-2sm [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:translate-y-0.5",
  {
    variants: {
      variant: {
        default: "border-border bg-subtle text-foreground [&>svg]:text-muted-foreground",
        info: "border-status-listed/25 bg-status-listed-soft text-foreground [&>svg]:text-status-listed",
        success: "border-status-active/25 bg-status-active-soft text-foreground [&>svg]:text-status-active",
        warning: "border-status-expiring/25 bg-status-expiring-soft text-foreground [&>svg]:text-status-expiring",
        destructive: "border-destructive/25 bg-destructive-soft text-foreground [&>svg]:text-destructive",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

const icons = {
  default: Info,
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  destructive: XCircle,
} as const;

export type AlertProps = HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof alertVariants> & { hideIcon?: boolean };

export const Alert = forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = "default", hideIcon, children, ...props }, ref) => {
    const Icon = icons[variant ?? "default"];
    return (
      <div ref={ref} role="alert" className={cn(alertVariants({ variant }), className)} {...props}>
        {hideIcon ? null : <Icon />}
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    );
  }
);
Alert.displayName = "Alert";

export function AlertTitle({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("font-medium leading-tight", className)} {...props} />;
}

export function AlertDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <div className={cn("mt-1 text-xs text-muted-foreground", className)} {...props} />;
}
