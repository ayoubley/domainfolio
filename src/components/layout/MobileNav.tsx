import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { NavLink } from "react-router-dom";
import { NAV_ITEMS } from "@/components/layout/nav-items";
import { LogoWordmark } from "@/components/shared/Logo";
import { WorkspaceSwitcher } from "@/components/layout/WorkspaceSwitcher";
import { Sheet, SheetContent, SheetClose } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

/** The sidebar as a drawer on small screens. */
export function MobileNav({
  open,
  onOpenChange,
  counts,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  counts: Partial<Record<string, number>>;
}) {
  const { t } = useTranslation();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[280px] gap-0 p-0" aria-label={t("app.name")}>
        <div className="flex h-14 items-center justify-between px-4">
          <LogoWordmark />
          <SheetClose asChild>
            <button
              type="button"
              aria-label={t("common.closeMenu")}
              className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </SheetClose>
        </div>
        <div className="px-3 pb-2">
          <WorkspaceSwitcher />
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4" aria-label={t("app.name")}>
          {NAV_ITEMS.map(item => {
            const count = counts[item.to];
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => onOpenChange(false)}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-2sm font-medium transition-colors",
                    isActive
                      ? "bg-card text-foreground shadow-xs"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )
                }
              >
                <item.icon className="size-4 shrink-0" />
                <span className="flex-1 truncate">{t(item.labelKey)}</span>
                {count ? (
                  <span className="tabular rounded-full bg-muted px-1.5 text-2xs font-medium text-muted-foreground">
                    {count}
                  </span>
                ) : null}
              </NavLink>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
