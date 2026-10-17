import { ChevronRight, Menu, Plus, Search } from "lucide-react";
import { Fragment } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { UserMenu } from "@/components/layout/UserMenu";
import { Button } from "@/components/ui/button";
import { shortcut } from "@/lib/platform";

export type Crumb = { label: string; to?: string };

export function Topbar({
  breadcrumbs,
  onOpenMenu,
  onOpenCommand,
  onOpenShortcuts,
  onNewDomain,
}: {
  breadcrumbs: Crumb[];
  onOpenMenu: () => void;
  onOpenCommand: () => void;
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

      <button
        type="button"
        onClick={onOpenCommand}
        className="hidden h-8 items-center gap-2 rounded-md border border-border bg-card px-2.5 text-xs text-muted-foreground shadow-xs transition-colors hover:border-border-strong hover:text-foreground lg:flex lg:w-64"
      >
        <Search className="size-3.5" />
        <span className="flex-1 text-start">{t("domains.searchPlaceholder")}</span>
        <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-sans text-2xs text-muted-foreground">
          {shortcut("K")}
        </kbd>
      </button>

      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onOpenCommand} aria-label={t("common.search")}>
        <Search />
      </Button>

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
