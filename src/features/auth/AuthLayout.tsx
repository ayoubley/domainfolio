import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Logo } from "@/components/shared/Logo";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

/** Split auth shell: a calm form on one side, a quiet brand panel on the other. */
export function AuthLayout({ children, title, subtitle }: { children: ReactNode; title: string; subtitle: string }) {
  const { t } = useTranslation();

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="flex flex-col">
        <div className="flex items-center justify-between px-5 py-4">
          <Link to="/" className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30">
            <Logo size={26} />
          </Link>
          <div className="flex items-center gap-0.5">
            <LanguageSwitcher compact />
            <ThemeToggle />
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center px-5 pb-12">
          <div className="w-full max-w-sm space-y-6">
            <header className="space-y-1.5">
              <h1 className="text-xl font-semibold tracking-tight text-foreground">{title}</h1>
              <p className="text-2sm text-muted-foreground">{subtitle}</p>
            </header>
            {children}
          </div>
        </div>
      </div>

      <aside className="relative hidden overflow-hidden border-s border-border bg-subtle lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          aria-hidden
          className="pointer-events-none absolute -end-24 -top-24 size-80 rounded-full bg-primary-soft blur-3xl"
        />
        <div className="relative">
          <p className="text-2sm font-medium text-primary">{t("app.name")}</p>
          <p className="mt-3 max-w-sm text-balance text-3xl font-semibold leading-tight tracking-tight text-foreground">
            {t("landing.title")}
          </p>
          <p className="mt-3 max-w-md text-pretty text-2sm text-muted-foreground">{t("landing.subtitle")}</p>
        </div>

        <dl className="relative grid grid-cols-2 gap-4">
          <Stat label={t("landing.features.renewals.title")} value={t("dashboard.expiring.subtitle")} />
          <Stat label={t("landing.features.profit.title")} value={t("dashboard.kpi.netProfit")} />
          <Stat label={t("landing.features.collaborative.title")} value={t("workspace.label")} />
          <Stat label={t("landing.features.bilingual.title")} value="English · العربية" />
        </dl>
      </aside>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-xs">
      <dt className="text-xs font-medium text-foreground">{label}</dt>
      <dd className="mt-1 text-2xs text-muted-foreground">{value}</dd>
    </div>
  );
}
