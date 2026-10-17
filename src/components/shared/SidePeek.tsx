import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/**
 * Side-peek panel: the app's primary "look at one thing without losing your
 * place" surface (domain detail, row inspectors). Slides in from the logical
 * end edge, which mirrors automatically in RTL.
 */
export function SidePeek({
  open,
  onOpenChange,
  children,
  className,
  label,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  className?: string;
  label?: string;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        aria-label={label}
        className={cn("w-full gap-0 p-0 sm:max-w-[440px]", className)}
      >
        {children}
      </SheetContent>
    </Sheet>
  );
}
