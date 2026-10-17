import { AnimatePresence, motion } from "framer-motion";
import { Check, Languages, Monitor, Moon, Palette, Sparkles, Sun, Tag } from "lucide-react";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Field } from "@/components/shared/Field";
import { LogoWordmark } from "@/components/shared/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useTheme, type ThemePreference } from "@/hooks/useTheme";
import { PURCHASE_CURRENCIES } from "@/lib/constants";
import { loadDemoData } from "@/features/domains/api";
import type { PurchaseCurrency } from "@/types/database";
import { cn } from "@/lib/utils";

const STEP_KEYS = ["workspace", "preferences", "data"] as const;

export function OnboardingPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { createWorkspace, workspaces, loading: workspaceLoading } = useWorkspace();
  const { theme, setTheme } = useTheme();

  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState<PurchaseCurrency>("USD");
  const [busy, setBusy] = useState(false);

  // If the user already has a workspace, this route has nothing to do.
  const hadWorkspaceAtMount = useRef<boolean | null>(null);
  if (hadWorkspaceAtMount.current === null && !workspaceLoading) {
    hadWorkspaceAtMount.current = workspaces.length > 0;
  }
  if (hadWorkspaceAtMount.current) return <Navigate to="/dashboard" replace />;

  function handleNext() {
    if (step === 0 && !name.trim()) return;
    if (step < STEP_KEYS.length - 1) setStep(step + 1);
  }

  async function finish(withDemo: boolean) {
    setBusy(true);
    const created = await createWorkspace({ name: name.trim() || t("workspace.personal"), defaultCurrency: currency });
    if (withDemo && created) {
      try {
        const count = await loadDemoData(created.id);
        toast.success(t("onboarding.demoLoaded", { count }));
      } catch {
        toast.error(t("toast.error"));
      }
    }
    setBusy(false);
    toast.success(t("onboarding.seeded"));
    navigate("/dashboard", { replace: true });
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between px-5 py-4">
        <LogoWordmark />
        <div className="flex items-center gap-0.5">
          <LanguageSwitcher compact />
          <ThemeToggle />
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-5 pb-16">
        {/* Progress */}
        <div className="mb-6 flex items-center gap-2">
          {STEP_KEYS.map((key, index) => (
            <div key={key} className="flex flex-1 items-center gap-2">
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full text-2xs font-semibold transition-colors",
                  index < step
                    ? "bg-primary text-primary-foreground"
                    : index === step
                      ? "border-2 border-primary text-primary"
                      : "border border-border text-muted-foreground"
                )}
              >
                {index < step ? <Check className="size-3.5" strokeWidth={3} /> : index + 1}
              </span>
              {index < STEP_KEYS.length - 1 ? (
                <span
                  className={cn("h-px flex-1 transition-colors", index < step ? "bg-primary" : "bg-border")}
                  aria-hidden
                />
              ) : null}
            </div>
          ))}
        </div>

        <p className="mb-1 text-2xs font-medium uppercase tracking-wide text-muted-foreground">
          {t("onboarding.step", { current: step + 1, total: STEP_KEYS.length })}
        </p>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            <h1 className="text-xl font-semibold tracking-tight text-foreground">{t(`onboarding.steps.${STEP_KEYS[step]}.title`)}</h1>
            <p className="mt-1 text-2sm text-muted-foreground">{t(`onboarding.steps.${STEP_KEYS[step]}.body`)}</p>

            <div className="mt-6 space-y-4">
              {step === 0 ? (
                <>
                  <Field id="onboarding-name" label={t("workspace.name")} required>
                    <Input
                      id="onboarding-name"
                      autoFocus
                      value={name}
                      placeholder={t("workspace.namePlaceholder")}
                      onChange={event => setName(event.target.value)}
                      onKeyDown={event => {
                        if (event.key === "Enter") void handleNext();
                      }}
                    />
                  </Field>
                  <Field id="onboarding-currency" label={t("workspace.currency")}>
                    <Select value={currency} onValueChange={value => setCurrency(value as PurchaseCurrency)}>
                      <SelectTrigger id="onboarding-currency">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PURCHASE_CURRENCIES.map(code => (
                          <SelectItem key={code} value={code}>
                            {code} · {t(`currency.${code}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </>
              ) : null}

              {step === 1 ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5">
                      <Palette className="size-3.5" />
                      {t("theme.label")}
                    </Label>
                    <div className="grid grid-cols-3 gap-2">
                      {(["light", "dark", "system"] as ThemePreference[]).map(option => {
                        const Icon = option === "light" ? Sun : option === "dark" ? Moon : Monitor;
                        const active = theme === option;
                        return (
                          <button
                            key={option}
                            type="button"
                            onClick={() => setTheme(option)}
                            className={cn(
                              "flex flex-col items-center gap-1.5 rounded-lg border p-3 text-2xs transition-colors",
                              active ? "border-primary bg-primary-soft text-primary" : "border-border text-muted-foreground hover:text-foreground"
                            )}
                          >
                            <Icon className="size-4" />
                            {t(`theme.${option}`)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5">
                      <Languages className="size-3.5" />
                      {t("language.label")}
                    </Label>
                    <LanguageSwitcher />
                  </div>
                </div>
              ) : null}

              {step === 2 ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => void finish(true)}
                    disabled={busy}
                    className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4 text-start shadow-xs transition-colors hover:border-primary disabled:opacity-60"
                  >
                    <span className="flex size-8 items-center justify-center rounded-md bg-primary-soft text-primary">
                      <Sparkles className="size-4" />
                    </span>
                    <span className="text-2sm font-semibold text-foreground">{t("onboarding.loadDemo")}</span>
                    <span className="text-2xs text-muted-foreground">{t("onboarding.loadDemoHint")}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void finish(false)}
                    disabled={busy}
                    className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4 text-start shadow-xs transition-colors hover:border-primary disabled:opacity-60"
                  >
                    <span className="flex size-8 items-center justify-center rounded-md bg-muted text-muted-foreground">
                      <Tag className="size-4" />
                    </span>
                    <span className="text-2sm font-semibold text-foreground">{t("onboarding.startEmpty")}</span>
                    <span className="text-2xs text-muted-foreground">{t("onboarding.startEmptyHint")}</span>
                  </button>
                </div>
              ) : null}
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="mt-8 flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            onClick={() => setStep(current => Math.max(0, current - 1))}
            disabled={step === 0 || busy}
          >
            {t("common.back")}
          </Button>
          {step < STEP_KEYS.length - 1 ? (
            <Button variant="primary" onClick={handleNext} loading={busy} disabled={step === 0 && !name.trim()}>
              {t("common.next")}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
