import { useEffect, useMemo, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { MobileNav } from "@/components/layout/MobileNav";
import { Sidebar } from "@/components/layout/Sidebar";
import { ShortcutsDialog } from "@/components/layout/ShortcutsDialog";
import { Topbar, type Crumb } from "@/components/layout/Topbar";
import { RouteErrorBoundary } from "@/components/shared/RouteErrorBoundary";
import { ImportDomainsDialog } from "@/features/domains/components/ImportDomainsDialog";
import { useDomainsQuery } from "@/features/domains/queries";
import { deriveDomains, isOwned, summarizePortfolio } from "@/lib/domain-rules";
import { APP_EVENTS, emit } from "@/lib/events";
import { useLocalStorage } from "@/hooks/useLocalStorage";

const CRUMB_LABELS: Record<string, string> = {
  "/dashboard": "nav.dashboard",
  "/domains": "nav.domains",
  "/renewals": "nav.renewals",
  "/sales": "nav.sales",
  "/expired": "nav.expired",
  "/analytics": "nav.analytics",
  "/archive": "nav.archive",
  "/activity": "nav.activity",
  "/import": "nav.import",
  "/settings": "nav.settings",
};

export function AppShell() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  const [collapsed, setCollapsed] = useLocalStorage("domainfolio.sidebar-collapsed", false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const { data: rows } = useDomainsQuery();
  const derived = useMemo(() => deriveDomains(rows ?? []), [rows]);
  const summary = useMemo(() => summarizePortfolio(derived), [derived]);

  const isTyping = () => {
    const element = document.activeElement;
    if (!element) return false;
    const tag = element.tagName.toLowerCase();
    return tag === "input" || tag === "textarea" || tag === "select" || (element as HTMLElement).isContentEditable;
  };

  // Global shortcuts: ⌘K palette, N new domain, / search, ? shortcuts, G-then-X nav.
  const goSequence = useRef(false);
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const meta = event.metaKey || event.ctrlKey;

      if (meta && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen(open => !open);
        return;
      }

      if (isTyping() || meta || event.altKey) return;

      if (event.key === "?") {
        event.preventDefault();
        setShortcutsOpen(true);
        return;
      }

      if (event.key === "/") {
        event.preventDefault();
        navigate("/domains");
        window.setTimeout(() => emit(APP_EVENTS.focusSearch), 60);
        return;
      }

      if (event.key.toLowerCase() === "n") {
        event.preventDefault();
        setImportOpen(true);
        return;
      }

      if (event.key.toLowerCase() === "g") {
        goSequence.current = true;
        window.setTimeout(() => {
          goSequence.current = false;
        }, 1200);
        return;
      }

      if (goSequence.current) {
        const map: Record<string, string> = {
          d: "/dashboard",
          o: "/domains",
          r: "/renewals",
          s: "/sales",
          e: "/expired",
          ",": "/settings",
        };
        const target = map[event.key.toLowerCase()];
        if (target) {
          event.preventDefault();
          navigate(target);
        }
        goSequence.current = false;
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [navigate]);

  const breadcrumbs = useMemo<Crumb[]>(() => {
    // Deep routes (e.g. /domains/5) keep the crumb of the section they sit in.
    const section = `/${location.pathname.split("/")[1] ?? ""}`;
    const labelKey = CRUMB_LABELS[location.pathname] ?? CRUMB_LABELS[section];
    const base: Crumb = { label: t("app.name"), to: "/dashboard" };
    if (!labelKey) return [{ label: t("app.name") }];
    return [base, { label: t(labelKey) }];
  }, [location.pathname, t]);

  const counts = useMemo(
    () => ({
      // The badge matches the Domains list exactly: sold and expired live on
      // their own pages now.
      "/domains": derived.filter(isOwned).length || undefined,
      "/renewals": summary.countsByRisk["0-30"] || undefined,
    }),
    [derived, summary]
  );

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <Sidebar
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed(value => !value)}
        counts={counts}
      />
      <MobileNav open={mobileOpen} onOpenChange={setMobileOpen} counts={counts} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          breadcrumbs={breadcrumbs}
          onOpenMenu={() => setMobileOpen(true)}
          onOpenShortcuts={() => setShortcutsOpen(true)}
          onNewDomain={() => setImportOpen(true)}
        />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto h-full w-full max-w-[1400px] p-4 sm:p-6">
            <RouteErrorBoundary>
              <Outlet />
            </RouteErrorBoundary>
          </div>
        </main>
      </div>

      <CommandPalette
        open={commandOpen}
        onOpenChange={setCommandOpen}
        domains={derived}
        onNewDomain={() => setImportOpen(true)}
        onExport={() => {
          navigate("/domains");
          window.setTimeout(() => emit(APP_EVENTS.exportView), 80);
        }}
      />
      <ShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
      <ImportDomainsDialog open={importOpen} onOpenChange={setImportOpen} />
    </div>
  );
}
