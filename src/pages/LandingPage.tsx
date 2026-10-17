import { ArrowRight, BarChart3, Languages, Repeat, ShieldCheck, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { LogoWordmark } from "@/components/shared/Logo";
import { useAuth } from "@/features/auth/AuthProvider";
import { useLanguage } from "@/hooks/useLanguage";

const FEATURES = [
  { key: "renewals", icon: Repeat },
  { key: "profit", icon: BarChart3 },
  { key: "collaborative", icon: ShieldCheck },
  { key: "bilingual", icon: Languages },
] as const;

/** Marketing landing page. Deliberately quiet — it sells the product, not the chrome. */
export function LandingPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isRtl } = useLanguage();

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <LogoWordmark />
          <div className="flex items-center gap-1">
            <LanguageSwitcher compact />
            <ThemeToggle />
            {user ? (
              <Button variant="primary" size="sm" onClick={() => navigate("/dashboard")}>
                {t("nav.dashboard")}
              </Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => navigate("/auth/login")}>
                  {t("landing.secondaryCta")}
                </Button>
                <Button variant="primary" size="sm" onClick={() => navigate("/auth/signup")}>
                  {t("landing.cta")}
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4">
        <section className="relative overflow-hidden py-20 text-center sm:py-28">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-64 w-[40rem] rounded-full bg-primary-soft/70 blur-3xl"
          />
          <div className="relative mx-auto max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-2xs font-medium text-muted-foreground shadow-xs">
              <Sparkles className="size-3 text-primary" />
              {t("landing.badge")}
            </span>
            <h1 className="mt-5 text-balance text-5xl font-semibold leading-[1.05] tracking-tight text-foreground">
              {t("landing.title")}
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-pretty text-base text-muted-foreground">{t("landing.subtitle")}</p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button size="lg" variant="primary" onClick={() => navigate("/auth/signup")}>
                {t("landing.cta")}
                <ArrowRight className={isRtl ? "rotate-180" : undefined} />
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate("/auth/login")}>
                {t("landing.secondaryCta")}
              </Button>
            </div>
          </div>
        </section>

        <section className="grid gap-4 pb-20 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(feature => (
            <div key={feature.key} className="rounded-lg border border-border bg-card p-5 shadow-xs">
              <span className="flex size-9 items-center justify-center rounded-lg bg-primary-soft text-primary">
                <feature.icon className="size-4" />
              </span>
              <h2 className="mt-3 text-sm font-semibold text-foreground">
                {t(`landing.features.${feature.key}.title`)}
              </h2>
              <p className="mt-1 text-pretty text-2xs text-muted-foreground">
                {t(`landing.features.${feature.key}.body`)}
              </p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-border py-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 text-2xs text-muted-foreground sm:flex-row">
          <span>{t("landing.footer")}</span>
          <Link to="/auth/login" className="font-medium text-primary hover:underline">
            {t("landing.secondaryCta")}
          </Link>
        </div>
      </footer>
    </div>
  );
}
