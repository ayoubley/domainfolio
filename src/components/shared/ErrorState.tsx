import { AlertTriangle, RefreshCw, WifiOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Error surface with an optional retry. Never a blank screen. */
export function ErrorState({
  title,
  description,
  onRetry,
  retrying,
  className,
  variant = "default",
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  retrying?: boolean;
  className?: string;
  variant?: "default" | "offline";
}) {
  const { t } = useTranslation();
  const Icon = variant === "offline" ? WifiOff : AlertTriangle;
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 px-6 py-14 text-center", className)}>
      <div className="flex size-11 items-center justify-center rounded-xl border border-destructive/20 bg-destructive-soft text-destructive">
        <Icon className="size-5" />
      </div>
      <div className="max-w-sm space-y-1">
        <p className="text-sm font-semibold text-foreground">
          {title ?? t(variant === "offline" ? "errors.offline" : "errors.loadFailed")}
        </p>
        <p className="text-pretty text-xs text-muted-foreground">
          {description ?? t(variant === "offline" ? "errors.offline" : "errors.loadFailedHint")}
        </p>
      </div>
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry} loading={retrying} className="mt-1">
          {retrying ? null : <RefreshCw />}
          {t("common.retry")}
        </Button>
      ) : null}
    </div>
  );
}
