import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";
import { AuthLayout } from "@/features/auth/AuthLayout";
import { useAuth } from "@/features/auth/AuthProvider";
import { Field } from "@/components/shared/Field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const schema = z.object({
  fullName: z.string().trim().min(1, "validation.required"),
  email: z.string().trim().min(1, "validation.required").email("validation.invalidEmail"),
  password: z.string().min(8, "validation.min8"),
});

type Values = z.infer<typeof schema>;

export function SignupPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [busy, setBusy] = useState(false);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: "", email: "", password: "" },
  });

  async function onSubmit(values: Values) {
    setBusy(true);
    const result = await signUp(values);
    setBusy(false);
    if (result.ok) {
      toast.success(t("auth.signUpSuccess"));
      navigate("/onboarding", { replace: true });
    } else {
      toast.error(result.message);
    }
  }

  const errorFor = (name: keyof Values) => {
    const message = form.formState.errors[name]?.message;
    return typeof message === "string" ? t(message) : undefined;
  };

  return (
    <AuthLayout title={t("auth.signUpTitle")} subtitle={t("auth.signUpSubtitle")}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Field id="fullName" label={t("auth.fullName")} error={errorFor("fullName")} required>
          <Input
            id="fullName"
            autoComplete="name"
            placeholder={t("auth.fullNamePlaceholder")}
            invalid={Boolean(form.formState.errors.fullName)}
            {...form.register("fullName")}
          />
        </Field>
        <Field id="email" label={t("auth.email")} error={errorFor("email")} required>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder={t("auth.emailPlaceholder")}
            invalid={Boolean(form.formState.errors.email)}
            {...form.register("email")}
          />
        </Field>
        <Field id="password" label={t("auth.password")} error={errorFor("password")} hint={t("validation.min8")} required>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder={t("auth.passwordPlaceholder")}
            invalid={Boolean(form.formState.errors.password)}
            {...form.register("password")}
          />
        </Field>
        <Button type="submit" variant="primary" size="lg" className="w-full" loading={busy}>
          {t("auth.signUp")}
        </Button>
      </form>

      <p className="text-center text-2sm text-muted-foreground">
        {t("auth.alreadyHaveAccount")}{" "}
        <Link to="/auth/login" className="font-medium text-primary hover:underline">
          {t("auth.signIn")}
        </Link>
      </p>
    </AuthLayout>
  );
}
