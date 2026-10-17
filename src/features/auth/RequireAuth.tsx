import { useTranslation } from "react-i18next";
import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "@/features/auth/AuthProvider";
import { useWorkspace } from "@/hooks/useWorkspace";
import { SupabaseNotice } from "@/features/auth/SupabaseNotice";
import { LogoWordmark } from "@/components/shared/Logo";

/** Route guard: requires a session, and an existing workspace. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const { configured, loading, user } = useAuth();
  const { loading: workspaceLoading, needsOnboarding } = useWorkspace();
  const location = useLocation();

  if (!configured) return <SupabaseNotice />;

  if (loading || (user && workspaceLoading)) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4">
        <LogoWordmark className="animate-pulse" />
        <p className="text-2sm text-muted-foreground">{t("app.booting")}</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth/login" replace state={{ from: location.pathname }} />;
  }

  if (needsOnboarding && location.pathname !== "/onboarding") {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
