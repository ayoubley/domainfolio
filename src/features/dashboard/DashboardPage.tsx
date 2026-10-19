import { useMemo, useState } from "react";
import {
  BadgeDollarSign,
  Banknote,
  CalendarClock,
  Coins,
  FolderClock,
  Globe,
  HandCoins,
  Plus,
  Receipt,
  Repeat,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Tag,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { KpiCard } from "@/components/shared/KpiCard";
import { KpiSkeleton, LoadingState } from "@/components/shared/LoadingState";
import { PageHeader } from "@/components/shared/PageHeader";
import { RiskBadge, StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ProfitChart,
  RenewalForecastChart,
  RiskMixChart,
  StatusMixChart,
} from "@/features/dashboard/PortfolioCharts";
import { useActivityQuery, useDomainsQuery, useLoadDemoData } from "@/features/domains/queries";
import { ImportDomainsDialog } from "@/features/domains/components/ImportDomainsDialog";
import { useAuth } from "@/features/auth/AuthProvider";
import { useWorkspace } from "@/hooks/useWorkspace";
import { deriveDomains, isArchived, isSold, summarizePortfolio } from "@/lib/domain-rules";
import { profitOverTime, renewalForecast } from "@/lib/analytics";
import { formatDate, money, percent, relativeDays, signedMoney } from "@/lib/format";
import { useLanguage } from "@/hooks/useLanguage";

export function DashboardPage() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const workspace = useWorkspace().current;
  const [importOpen, setImportOpen] = useState(false);

  const { data: rows, isLoading, isError, refetch, isFetching } = useDomainsQuery(true);
  const { data: activity, isLoading: activityLoading } = useActivityQuery(8);
  const demoMutation = useLoadDemoData();

  const derived = useMemo(() => deriveDomains(rows ?? []), [rows]);
  /**
   * Sold domains are archived the moment they are sold, so they only reach this
   * page when archived rows are fetched too. The dashboard counts the portfolio
   * **plus** everything that was sold; a domain that was archived without a sale
   * has left the portfolio and affects no figure here.
   */
  const portfolio = useMemo(
    () => derived.filter(record => !isArchived(record) || isSold(record)),
    [derived]
  );
  const unsold = useMemo(() => portfolio.filter(record => !isSold(record)), [portfolio]);
  const summary = useMemo(() => summarizePortfolio(portfolio), [portfolio]);
  const currency = workspace?.default_currency ?? "USD";

  const forecast = useMemo(() => renewalForecast(portfolio, language, 12), [portfolio, language]);
  const profitSeries = useMemo(() => profitOverTime(portfolio, language), [portfolio, language]);

  const name = profile?.full_name ?? (user?.user_metadata?.full_name as string | undefined);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? t("dashboard.greetingMorning") : hour < 18 ? t("dashboard.greetingAfternoon") : t("dashboard.greetingEvening");

  if (isError) {
    return (
      <div className="space-y-5">
        <PageHeader title={t("dashboard.title")} />
        <ErrorState onRetry={() => void refetch()} retrying={isFetching} />
      </div>
    );
  }

  if (!isLoading && portfolio.length === 0) {
    return (
      <div className="space-y-5">
        <PageHeader title={t("dashboard.title")} description={t("dashboard.subtitle")} />
        <div className="rounded-lg border border-dashed border-border-strong bg-card">
          <EmptyState
            icon={Globe}
            title={t("domains.emptyTitle")}
            description={t("domains.emptyBody")}
            action={
              <Button
                variant="primary"
                loading={demoMutation.isPending}
                onClick={async () => {
                  const count = await demoMutation.mutateAsync();
                  toast.success(t("domains.demoLoaded", { count }));
                }}
              >
                <Sparkles />
                {t("domains.loadDemo")}
              </Button>
            }
            secondaryAction={
              <Button variant="outline" onClick={() => setImportOpen(true)}>
                <Plus />
                {t("domains.addDomain")}
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${greeting}${name ? `, ${name.split(" ")[0]}` : ""}`}
        description={t("dashboard.subtitle")}
        actions={
          <>
            <Button variant="outline" onClick={() => navigate("/renewals")}>
              <Repeat />
              {t("dashboard.reviewRenewals")}
            </Button>
            <Button variant="primary" onClick={() => setImportOpen(true)}>
              <Plus />
              {t("domains.addDomain")}
            </Button>
          </>
        }
      />

      {isLoading ? (
        <KpiSkeleton count={10} />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <KpiCard
            label={t("dashboard.kpi.totalDomains")}
            value={summary.totalDomains}
            icon={Globe}
            to="/domains"
            footer={
              <p className="text-2xs text-muted-foreground">
                {t("dashboard.kpi.activeDomains")}: {summary.activeDomains} · {t("dashboard.kpi.listedDomains")}:{" "}
                {summary.listedDomains}
              </p>
            }
          />
          <KpiCard
            label={t("dashboard.kpi.portfolioValue")}
            value={summary.estimatedPortfolioValue}
            format="money"
            currency={currency}
            icon={Coins}
            to="/domains"
            footer={
              <p className="text-2xs text-muted-foreground">
                {t("dashboard.kpi.listPrice")}: {money(summary.totalListPrice, { currency, compact: true })}
              </p>
            }
          />
          <KpiCard
            label={t("dashboard.kpi.purchaseCost")}
            value={summary.totalPurchaseCost}
            format="money"
            currency={currency}
            icon={Banknote}
            to="/domains"
          />
          <KpiCard
            label={t("dashboard.kpi.totalSales")}
            value={summary.totalSales}
            format="money"
            currency={currency}
            icon={HandCoins}
            tone={summary.totalSales > 0 ? "positive" : "neutral"}
            to="/sales"
          />
          <KpiCard
            label={t("dashboard.kpi.netProfit")}
            value={summary.netProfit}
            format="money"
            currency={currency}
            tone={summary.netProfit >= 0 ? "positive" : "negative"}
            icon={BadgeDollarSign}
            hint={t("dashboard.kpiHint.netProfit")}
            to="/sales"
          />
          <KpiCard
            label={t("dashboard.kpi.soldDomains")}
            value={summary.soldDomains}
            icon={Tag}
            to="/sales"
            footer={
              <p className="text-2xs text-muted-foreground">
                {t("dashboard.kpi.sellRate")}: {percent(summary.sellRate)}
              </p>
            }
          />
          <KpiCard
            label={t("dashboard.kpi.expiringSoon")}
            value={summary.expiring30.length}
            tone={summary.expiring30.length > 0 ? "warning" : "neutral"}
            icon={CalendarClock}
            to="/renewals"
            footer={
              <p className="text-2xs text-muted-foreground">
                {t("dashboard.expiring.subtitle")}
              </p>
            }
          />
          <KpiCard
            label={t("dashboard.kpi.expiredDomains")}
            value={summary.expiredDomains}
            tone={summary.expiredDomains > 0 ? "negative" : "neutral"}
            icon={ShieldAlert}
            to="/expired"
          />
          <KpiCard
            label={t("dashboard.kpi.renewedDomains")}
            value={summary.renewedDomains}
            icon={RotateCcw}
            to="/renewals"
          />
          <KpiCard
            label={t("dashboard.kpi.documentedRenewalCost")}
            value={summary.totalRenewalCost}
            format="money"
            currency={currency}
            icon={Receipt}
            hint={t("dashboard.kpiHint.renewalCost")}
            to="/renewals"
          />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Expiring soon */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between gap-2 pb-2">
            <div>
              <CardTitle>{t("dashboard.expiring.title")}</CardTitle>
              <p className="mt-0.5 text-2xs text-muted-foreground">{t("dashboard.expiring.subtitle")}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate("/renewals")}>
              {t("dashboard.viewAll")}
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <LoadingState rows={3} />
            ) : summary.expiring90.length === 0 ? (
              <EmptyState
                compact
                icon={CalendarClock}
                title={t("dashboard.expiring.empty")}
                description={t("dashboard.expiring.emptyHint")}
              />
            ) : (
              <ul className="divide-y divide-border">
                {summary.expiring90.slice(0, 6).map(domain => (
                  <li key={domain.id} className="flex items-center gap-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <Link
                        to={`/domains?focus=${domain.id}`}
                        className="block truncate text-2sm font-medium tabular text-foreground hover:text-primary"
                      >
                        {domain.domain}
                      </Link>
                      <p className="text-2xs text-muted-foreground">
                        {domain.expiry_date ? t("domains.detail.expiresOn", { date: formatDate(domain.expiry_date) }) : "—"}
                        {domain.renewal_cost !== null ? ` · ${money(domain.renewal_cost, { currency: domain.purchase_currency })}` : null}
                      </p>
                    </div>
                    <RiskBadge risk={domain.expiryRisk} />
                    <span
                      className={
                        domain.daysLeft !== null && domain.daysLeft <= 15
                          ? "tabular text-2xs font-medium text-status-expiring"
                          : "tabular text-2xs text-muted-foreground"
                      }
                    >
                      {relativeDays(domain.daysLeft)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Activity */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>{t("dashboard.activity.title")}</CardTitle>
            <p className="text-2xs text-muted-foreground">{t("dashboard.activity.subtitle")}</p>
          </CardHeader>
          <CardContent>
            {activityLoading ? (
              <LoadingState rows={3} />
            ) : !activity || activity.length === 0 ? (
              <EmptyState
                compact
                icon={FolderClock}
                title={t("dashboard.activity.empty")}
                description={t("dashboard.activity.emptyHint")}
              />
            ) : (
              <ol className="space-y-3">
                {activity.map(entry => (
                  <li key={entry.id} className="relative ps-4">
                    <span className="absolute start-0 top-1.5 size-1.5 rounded-full bg-primary" aria-hidden />
                    <p className="text-2xs text-foreground">{entry.summary}</p>
                    <p className="text-2xs text-muted-foreground">
                      {t(`activityAction.${entry.action}`)} · {formatDate(entry.created_at)}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <RenewalForecastChart data={forecast} currency={currency} />
        <ProfitChart data={profitSeries} currency={currency} />
        <StatusMixChart records={portfolio} />
        <RiskMixChart records={unsold} />
      </div>

      {/* Portfolio mix summary strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(["active", "listed", "sold", "expired"] as const).map(status => (
          <button
            key={status}
            type="button"
            onClick={() => navigate("/domains")}
            className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2.5 text-start shadow-xs transition-colors hover:border-border-strong"
          >
            <StatusBadge status={status} />
            <span className="tabular text-sm font-semibold text-foreground">{summary.countsByStatus[status]}</span>
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-border bg-subtle/40 px-4 py-3 text-2xs text-muted-foreground">
        {t("dashboard.kpi.totalSales")}: {money(summary.totalSales, { currency })} ·{" "}
        {t("dashboard.kpi.dataQuality")}: {summary.dataQualityIssues} · {t("dashboard.kpi.roi")}: {percent(summary.roi)} ·{" "}
        {signedMoney(summary.netProfit, currency)}
      </div>

      <ImportDomainsDialog open={importOpen} onOpenChange={setImportOpen} />
    </div>
  );
}
