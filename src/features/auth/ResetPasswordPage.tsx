import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";
import { AuthLayout } from "@/features/auth/AuthLayout";
import { useAuth } from "@/features/auth/AuthProvider";
import { Field } from "@/components/shared/Field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const schema = z
  .object({
    password: z.string().min(8, "validation.min8"),
    confirmPassword: z.string().min(1, "validation.required"),
  })
  .refine(values => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "auth.passwordMismatch",
  });

type Values = z.infer<typeof schema>;

export function ResetPasswordPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { updatePassword } = useAuth();
  const [busy, setBusy] = useState(false);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  async function onSubmit(values: Values) {
    setBusy(true);
    const result = await updatePassword(values.password);
    setBusy(false);
    if (result.ok) {
      toast.success(t("auth.passwordUpdated"));
      navigate("/dashboard", { replace: true });
    } else {
      toast.error(result.message);
    }
  }

  const errorFor = (name: keyof Values) => {
    const message = form.formState.errors[name]?.message;
    return typeof message === "string" ? t(message) : undefined;
  };

  return (
    <AuthLayout title={t("auth.resetTitle")} subtitle={t("auth.resetSubtitle")}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Field id="password" label={t("auth.newPassword")} error={errorFor("password")} required>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            invalid={Boolean(form.formState.errors.password)}
            {...form.register("password")}
          />
        </Field>
        <Field id="confirmPassword" label={t("auth.confirmPassword")} error={errorFor("confirmPassword")} required>
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            invalid={Boolean(form.formState.errors.confirmPassword)}
            {...form.register("confirmPassword")}
          />
        </Field>
        <Button type="submit" variant="primary" size="lg" className="w-full" loading={busy}>
          {t("common.save")}
        </Button>
      </form>
    </AuthLayout>
  );
}
