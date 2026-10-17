import { zodResolver } from "@hookform/resolvers/zod";
import { Mail } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";
import { AuthLayout } from "@/features/auth/AuthLayout";
import { useAuth } from "@/features/auth/AuthProvider";
import { Field } from "@/components/shared/Field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

const schema = z.object({
  email: z.string().trim().min(1, "validation.required").email("validation.invalidEmail"),
  password: z.string().min(1, "validation.required"),
});

type Values = z.infer<typeof schema>;

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, signInWithMagicLink } = useAuth();
  const [mode, setMode] = useState<"password" | "magic">("password");
  const [busy, setBusy] = useState(false);

  const from = (location.state as { from?: string } | null)?.from ?? "/dashboard";
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: "", password: "" } });

  async function onSubmit(values: Values) {
    setBusy(true);
    if (mode === "magic") {
      const result = await signInWithMagicLink(values.email);
      setBusy(false);
      if (result.ok) toast.success(t("auth.magicLinkSent"));
      else toast.error(result.message);
      return;
    }
    const result = await signIn(values.email, values.password);
    setBusy(false);
    if (result.ok) {
      toast.success(t("auth.signInSuccess"));
      navigate(from, { replace: true });
    } else {
      toast.error(result.message);
    }
  }

  const emailError = form.formState.errors.email?.message;
  const passwordError = form.formState.errors.password?.message;

  return (
    <AuthLayout title={t("auth.signInTitle")} subtitle={t("auth.signInSubtitle")}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Field id="email" label={t("auth.email")} error={emailError ? t(emailError) : undefined} required>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder={t("auth.emailPlaceholder")}
            invalid={Boolean(emailError)}
            {...form.register("email")}
          />
        </Field>

        {mode === "password" ? (
          <Field
            id="password"
            label={t("auth.password")}
            error={passwordError ? t(passwordError) : undefined}
            required
            labelAccessory={
              <Link to="/auth/forgot-password" className="text-2xs font-medium text-primary hover:underline">
                {t("auth.forgotPassword")}
              </Link>
            }
          >
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder={t("auth.passwordPlaceholder")}
              invalid={Boolean(passwordError)}
              {...form.register("password")}
            />
          </Field>
        ) : null}

        <Button type="submit" variant="primary" size="lg" className="w-full" loading={busy}>
          {mode === "magic" ? t("auth.magicLink") : t("auth.signIn")}
        </Button>

        <div className="relative py-1 text-center">
          <Separator />
          <span className="absolute inset-x-0 -top-1 mx-auto w-fit bg-background px-2 text-2xs text-muted-foreground">
            {t("auth.orContinueWith")}
          </span>
        </div>

        <Button
          type="button"
          variant="outline"
          size="lg"
          className="w-full"
          onClick={() => setMode(current => (current === "password" ? "magic" : "password"))}
        >
          {mode === "password" ? <Mail /> : null}
          {mode === "password" ? t("auth.magicLink") : t("auth.signIn")}
        </Button>
      </form>

      <p className="text-center text-2sm text-muted-foreground">
        {t("auth.noAccount")}{" "}
        <Link to="/auth/signup" className="font-medium text-primary hover:underline">
          {t("auth.signUp")}
        </Link>
      </p>
    </AuthLayout>
  );
}
