import { AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LogoWordmark } from "@/components/shared/Logo";

const MISSING_MESSAGE =
  "Supabase is not configured. Copy .env.example to .env.local and set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.";

/** Shown when env vars are absent, instead of a broken login form. */
export function SupabaseNotice() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-dvh items-center justify-center p-6">
      <div className="w-full max-w-md space-y-5">
        <LogoWordmark />
        <Alert variant="warning">
          <AlertTitle>{t("app.notConfiguredTitle")}</AlertTitle>
          <AlertDescription>
            <p>{t("app.notConfiguredBody")}</p>
            <p className="mt-2">{t("app.notConfiguredHint")}</p>
          </AlertDescription>
        </Alert>
        <div className="flex items-start gap-2 rounded-lg border border-border bg-card p-3 text-2xs text-muted-foreground">
          <AlertTriangle className="mt-px size-3.5 shrink-0" />
          <span className="font-mono">{MISSING_MESSAGE}</span>
        </div>
      </div>
    </div>
  );
}
