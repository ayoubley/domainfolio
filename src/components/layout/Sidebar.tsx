import { motion } from "framer-motion";
import { ChevronsLeft, PanelLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { NavLink } from "react-router-dom";
import { NAV_ITEMS } from "@/components/layout/nav-items";
import { Logo, LogoWordmark } from "@/components/shared/Logo";
import { WorkspaceSwitcher } from "@/components/layout/WorkspaceSwitcher";
import { Button } from "@/components/ui/button";
import { SimpleTooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type SidebarCounts = Partial<Record<string, number>>;

export function Sidebar({
  collapsed,
  onToggleCollapsed,
  counts,
}: {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  counts: SidebarCounts;
}) {
  const { t } = useTranslation();

  return (
    <aside
      className={cn(
        "hidden shrink-0 flex-col border-e border-border bg-subtle/60 md:flex",
        collapsed ? "w-[68px]" : "w-[248px]"
      )}
    >
      <div className={cn("flex h-14 items-center px-3", collapsed ? "justify-center" : "justify-between gap-2")}>
        {collapsed ? (
          <Logo size={26} />
        ) : (
          <>
            <LogoWordmark className="px-1" />
            <SimpleTooltip content={t("common.toggleSidebar")}>
              <Button variant="ghost" size="icon-sm" onClick={onToggleCollapsed} aria-label={t("common.toggleSidebar")}>
                <ChevronsLeft className="rtl:rotate-180" />
              </Button>
            </SimpleTooltip>
          </>
        )}
      </div>

      <div className={cn("px-2.5 pb-2", collapsed && "px-2")}>
        <WorkspaceSwitcher collapsed={collapsed} />
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2.5 pb-4" aria-label={t("app.name")}>
        {NAV_ITEMS.map(item => {
          const count = counts[item.to];
          return (
            <SimpleTooltip key={item.to} content={collapsed ? t(item.labelKey) : ""} side="right">
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "group relative flex items-center gap-2.5 rounded-md py-1.5 text-2sm font-medium transition-colors",
                    collapsed ? "justify-center px-2" : "px-2.5",
                    isActive
                      ? "bg-card text-foreground shadow-xs"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive ? (
                      <motion.span
                        layoutId="sidebar-active"
                        transition={{ duration: 0.18, ease: "easeOut" }}
                        className="absolute inset-y-1 start-0 w-0.5 rounded-full bg-primary"
                      />
                    ) : null}
                    <item.icon className="size-4 shrink-0" />
                    {collapsed ? null : (
                      <>
                        <span className="flex-1 truncate">{t(item.labelKey)}</span>
                        {count ? (
                          <span className="tabular rounded-full bg-muted px-1.5 text-2xs font-medium text-muted-foreground group-hover:bg-card">
                            {count}
                          </span>
                        ) : null}
                      </>
                    )}
                  </>
                )}
              </NavLink>
            </SimpleTooltip>
          );
        })}
      </nav>

      {collapsed ? (
        <div className="border-t border-border p-2.5">
          <div className="flex justify-center">
            <SimpleTooltip content={t("common.toggleSidebar")} side="right">
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggleCollapsed}
                aria-label={t("common.toggleSidebar")}
              >
                <PanelLeft className="rtl:rotate-180" />
              </Button>
            </SimpleTooltip>
          </div>
        </div>
      ) : null}
    </aside>
  );
}
