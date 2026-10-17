import { CheckCircle2, Info, Loader2, TriangleAlert, XCircle } from "lucide-react";
import { Toaster as Sonner } from "sonner";
import { useTheme } from "@/hooks/useTheme";

/** App-wide toaster. A single toast stack, themed with the rest of the app. */
export function Toaster() {
  const { resolvedTheme } = useTheme();

  return (
    <Sonner
      theme={resolvedTheme}
      position="bottom-right"
      closeButton
      duration={4000}
      className="toaster group"
      icons={{
        success: <CheckCircle2 className="size-4" />,
        info: <Info className="size-4" />,
        warning: <TriangleAlert className="size-4" />,
        error: <XCircle className="size-4" />,
        loading: <Loader2 className="size-4 animate-spin" />,
      }}
      toastOptions={{
        classNames: {
          toast:
            "group toast !rounded-lg !border-border !bg-popover !text-popover-foreground !shadow-lg !text-2sm",
          title: "!font-medium",
          description: "!text-muted-foreground",
          actionButton: "!rounded-md !bg-primary !text-primary-foreground !text-xs",
          cancelButton: "!rounded-md !bg-muted !text-muted-foreground !text-xs",
          closeButton: "!border-border !bg-popover",
        },
      }}
    />
  );
}
