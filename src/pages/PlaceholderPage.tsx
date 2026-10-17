import { Construction, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";

/**
 * Polished "coming soon" surface. Every unfinished route renders this rather
 * than a blank page, so the app never looks broken mid-build.
 */
export function PlaceholderPage({ pageKey }: { pageKey: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <PageHeader title={t(`${pageKey}.title`)} description={t(`${pageKey}.subtitle`)} />

      <div className="relative overflow-hidden rounded-lg border border-dashed border-border-strong bg-card">
        <div
          aria-hidden
          className="pointer-events-none absolute -end-16 -top-16 size-56 rounded-full bg-primary-soft/60 blur-3xl"
        />
        <div className="relative flex flex-col items-center gap-4 px-6 py-20 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl border border-border bg-subtle text-primary">
            <Construction className="size-5" />
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-2.5 py-0.5 text-2xs font-medium text-primary">
            <Sparkles className="size-3" />
            {t("placeholder.badge")}
          </span>
          <div className="max-w-md space-y-2">
            <h2 className="text-base font-semibold tracking-tight text-foreground">{t("placeholder.title")}</h2>
            <p className="text-pretty text-2sm text-muted-foreground">
              {t("placeholder.body", { page: t(`${pageKey}.title`) })}
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate("/dashboard")} className="mt-1">
            {t("placeholder.cta")}
          </Button>
        </div>
      </div>
    </div>
  );
}
