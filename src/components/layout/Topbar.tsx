import { ChevronRight, Menu, Plus } from "lucide-react";
import { Fragment } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { UserMenu } from "@/components/layout/UserMenu";
import { Button } from "@/components/ui/button";

export type Crumb = { label: string; to?: string };

export function Topbar({
  breadcrumbs,
  onOpenMenu,
  onOpenShortcuts,
  onNewDomain,
}: {
  breadcrumbs: Crumb[];
  onOpenMenu: () => void;
  onOpenShortcuts: () => void;
  onNewDomain: () => void;
}) {
  const { t } = useTranslation();

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-md">
      <Button variant="ghost" size="icon" className="md:hidden" onClick={onOpenMenu} aria-label={t("common.openMenu")}>
        <Menu />
      </Button>

      <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
        <ol className="flex items-center gap-1.5 text-2sm">
          {breadcrumbs.map((crumb, index) => {
            const last = index === breadcrumbs.length - 1;
            return (
              <Fragment key={`${crumb.label}-${index}`}>
                {index > 0 ? <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/60 rtl:rotate-180" /> : null}
                <li className="min-w-0">
                  {crumb.to && !last ? (
                    <Link
                      to={crumb.to}
                      className="block truncate rounded text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className={last ? "block truncate font-medium text-foreground" : "block truncate text-muted-foreground"}>
                      {crumb.label}
                    </span>
                  )}
                </li>
              </Fragment>
            );
          })}
        </ol>
      </nav>

      <Button variant="primary" size="sm" onClick={onNewDomain} className="hidden sm:inline-flex">
        <Plus />
        {t("domains.addDomain")}
      </Button>

      <div className="flex items-center gap-0.5">
        <LanguageSwitcher compact />
        <ThemeToggle />
        <UserMenu onShowShortcuts={onOpenShortcuts} />
      </div>
    </header>
  );
}
