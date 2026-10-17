import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";
import { AuthLayout } from "@/features/auth/AuthLayout";
import { useAuth } from "@/features/auth/AuthProvider";
import { Field } from "@/components/shared/Field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const schema = z.object({
  email: z.string().trim().min(1, "validation.required").email("validation.invalidEmail"),
});

type Values = z.infer<typeof schema>;

export function ForgotPasswordPage() {
  const { t } = useTranslation();
  const { sendPasswordReset } = useAuth();
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<string | null>(null);

  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: "" } });
  const emailError = form.formState.errors.email?.message;

  async function onSubmit(values: Values) {
    setBusy(true);
    const result = await sendPasswordReset(values.email);
    setBusy(false);
    if (result.ok) {
      setSent(values.email);
      toast.success(t("auth.resetSentSuccess"));
    } else {
      toast.error(result.message);
    }
  }

  if (sent) {
    return (
      <AuthLayout title={t("auth.checkEmailTitle")} subtitle={t("auth.checkEmailBody", { email: sent })}>
        <Button variant="outline" size="lg" className="w-full" onClick={() => setSent(null)}>
          {t("auth.sendResetLink")}
        </Button>
        <Link to="/auth/login" className="block text-center text-2sm font-medium text-primary hover:underline">
          {t("auth.backToSignIn")}
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title={t("auth.forgotTitle")} subtitle={t("auth.forgotSubtitle")}>
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
        <Button type="submit" variant="primary" size="lg" className="w-full" loading={busy}>
          {t("auth.sendResetLink")}
        </Button>
      </form>
      <Link to="/auth/login" className="block text-center text-2sm font-medium text-primary hover:underline">
        {t("auth.backToSignIn")}
      </Link>
    </AuthLayout>
  );
}
