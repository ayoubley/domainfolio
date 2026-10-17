import { lazy, Suspense, type ReactNode } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { RouteFallback } from "@/components/shared/RouteFallback";
import { RequireAuth } from "@/features/auth/RequireAuth";

/**
 * Every page is loaded on demand so the first paint ships only the shell.
 * Marketing, auth, onboarding and each app page get their own chunk.
 */
const LandingPage = lazy(() => import("@/pages/LandingPage").then(module => ({ default: module.LandingPage })));
const NotFoundPage = lazy(() =>
  import("@/pages/NotFoundPage").then(module => ({ default: module.NotFoundPage }))
);

const LoginPage = lazy(() => import("@/features/auth/LoginPage").then(module => ({ default: module.LoginPage })));
const SignupPage = lazy(() => import("@/features/auth/SignupPage").then(module => ({ default: module.SignupPage })));
const ForgotPasswordPage = lazy(() =>
  import("@/features/auth/ForgotPasswordPage").then(module => ({ default: module.ForgotPasswordPage }))
);
const ResetPasswordPage = lazy(() =>
  import("@/features/auth/ResetPasswordPage").then(module => ({ default: module.ResetPasswordPage }))
);

const OnboardingPage = lazy(() =>
  import("@/features/onboarding/OnboardingPage").then(module => ({ default: module.OnboardingPage }))
);

const DashboardPage = lazy(() =>
  import("@/features/dashboard/DashboardPage").then(module => ({ default: module.DashboardPage }))
);
const DomainsPage = lazy(() => import("@/features/domains/DomainsPage").then(module => ({ default: module.DomainsPage })));
const RenewalsPage = lazy(() =>
  import("@/features/renewals/RenewalsPage").then(module => ({ default: module.RenewalsPage }))
);
const SalesPage = lazy(() => import("@/features/sales/SalesPage").then(module => ({ default: module.SalesPage })));
const AnalyticsPage = lazy(() =>
  import("@/features/analytics/AnalyticsPage").then(module => ({ default: module.AnalyticsPage }))
);
const ArchivePage = lazy(() => import("@/features/domains/ArchivePage").then(module => ({ default: module.ArchivePage })));
const ActivityPage = lazy(() =>
  import("@/features/domains/ActivityPage").then(module => ({ default: module.ActivityPage }))
);
const ImportPage = lazy(() => import("@/features/domains/ImportPage").then(module => ({ default: module.ImportPage })));
const SettingsPage = lazy(() => import("@/features/settings/SettingsPage").then(module => ({ default: module.SettingsPage })));

/** Wraps a lazy page so the shell stays mounted while its chunk loads. */
function page(node: ReactNode, full = false) {
  return <Suspense fallback={<RouteFallback full={full} />}>{node}</Suspense>;
}

export const router = createBrowserRouter([
  { path: "/", element: page(<LandingPage />, true) },
  { path: "/auth", element: <Navigate to="/auth/login" replace /> },
  { path: "/auth/login", element: page(<LoginPage />, true) },
  { path: "/auth/signup", element: page(<SignupPage />, true) },
  { path: "/auth/forgot-password", element: page(<ForgotPasswordPage />, true) },
  { path: "/auth/reset-password", element: page(<ResetPasswordPage />, true) },
  {
    path: "/onboarding",
    element: <RequireAuth>{page(<OnboardingPage />)}</RequireAuth>,
  },
  {
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
    children: [
      { path: "/dashboard", element: page(<DashboardPage />) },
      { path: "/domains", element: page(<DomainsPage />) },
      { path: "/renewals", element: page(<RenewalsPage />) },
      { path: "/sales", element: page(<SalesPage />) },
      { path: "/analytics", element: page(<AnalyticsPage />) },
      { path: "/archive", element: page(<ArchivePage />) },
      { path: "/activity", element: page(<ActivityPage />) },
      { path: "/import", element: page(<ImportPage />) },
      { path: "/settings", element: page(<SettingsPage />) },
    ],
  },
  { path: "*", element: page(<NotFoundPage />, true) },
]);
