import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { CalendarClock, FileSearch, Repeat, RotateCw, Wallet } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { DataTable } from "@/components/shared/DataTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { KpiCard } from "@/components/shared/KpiCard";
import { PageHeader } from "@/components/shared/PageHeader";
import { SegmentedControl } from "@/components/shared/SegmentedControl";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { RenewDomainDialog } from "@/features/domains/components/DomainQuickDialogs";
import { useDomainsQuery, useRenewDomain } from "@/features/domains/queries";
import { deriveDomains, isExpired, summarizePortfolio } from "@/lib/domain-rules";
import type { DerivedDomain } from "@/lib/domain-rules";
import { formatDate, money, relativeDays } from "@/lib/format";
import { useWorkspace } from "@/hooks/useWorkspace";
import { cn } from "@/lib/utils";

/** The renewal windows the page filters by. */
type RenewalWindow = "30" | "60" | "90" | "expired";

/**
 * The renewals desk: what is coming due, what it will cost, and the one action
 * that matters here — recording a renewal. Confirming a renewal moves the
 * expiry a year ahead and writes the cost, so every figure on this page is
 * stored data rather than an estimate.
 */
export function RenewalsPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language.startsWith("ar") ? "ar" : "en";
  const workspace = useWorkspace().current;
  const workspaceCurrency = workspace?.default_currency ?? "USD";

  const [window, setWindow] = useState<RenewalWindow>("30");
  const [renewTarget, setRenewTarget] = useState<DerivedDomain | null>(null);

  const { data: rows, isLoading, isError, refetch, isFetching } = useDomainsQuery();
  const renewMutation = useRenewDomain();

  const derived = useMemo(() => deriveDomains(rows ?? []), [rows]);
  const summary = useMemo(() => summarizePortfolio(derived), [derived]);
  const expired = useMemo(() => derived.filter(isExpired), [derived]);

  const lists: Record<RenewalWindow, DerivedDomain[]> = {
    "30": summary.expiring30,
    "60": summary.expiring60,
    "90": summary.expiring90,
    expired,
  };
  const list = lists[window];

  // Renewals due within 30 days whose cost was never recorded — the ones that
  // still need a human to fill the number in.
  const unreviewed = summary.expiring30.filter(record => record.renewal_cost === null).length;

  const columns = useMemo<ColumnDef<DerivedDomain, unknown>[]>(
    () => [
      {
        id: "domain",
        accessorKey: "domain",
        header: t("domains.columns.domain"),
        size: 280,
        cell: ({ row }) => (
          <span className="flex flex-wrap items-center gap-1.5">
            <span dir="ltr" className="font-medium tabular text-foreground">
              {row.original.domain}
            </span>
            <StatusBadge status={row.original.effectiveStatus} />
          </span>
        ),
      },
      {
        id: "expiryDate",
        accessorFn: row => row.daysLeft ?? Number.POSITIVE_INFINITY,
        header: t("domains.columns.expiryDate"),
        size: 130,
        cell: ({ row }) => {
          const { expiry_date, daysLeft } = row.original;
          if (!expiry_date) return <span className="text-muted-foreground">—</span>;
          const urgent = daysLeft !== null && daysLeft <= 30;
          return (
            <span className={cn("tabular", urgent ? "font-medium text-negative" : "text-muted-foreground")}>
              {formatDate(expiry_date)}
            </span>
          );
        },
      },
      {
        id: "daysLeft",
        accessorFn: row => row.daysLeft ?? 0,
        header: t("domains.detail.daysLeft"),
        size: 120,
        cell: ({ row }) => (
          <span className="tabular text-muted-foreground">{relativeDays(row.original.daysLeft, locale)}</span>
        ),
      },
      {
        id: "renewalCost",
        accessorFn: row => row.renewal_cost ?? 0,
        header: t("domains.form.renewalCost"),
        size: 130,
        cell: ({ row }) => (
          <span className="tabular text-muted-foreground">
            {money(row.original.renewal_cost, { currency: row.original.purchase_currency })}
          </span>
        ),
      },
      {
        id: "decision",
        accessorFn: row => row.renewal_decision,
        header: t("domains.columns.renewalDecision"),
        size: 130,
        cell: ({ row }) => (
          <span className="text-muted-foreground">{t(`decision.${row.original.renewal_decision}`)}</span>
        ),
      },
      {
        id: "action",
        header: t("common.actions"),
        size: 120,
        enableSorting: false,
        cell: ({ row }) => (
          <Button size="sm" variant="outline" onClick={() => setRenewTarget(row.original)}>
            <RotateCw />
            {t("domains.detail.renewNow")}
          </Button>
        ),
      },
    ],
    [t, locale]
  );

  return (
    <div className="space-y-5">
      <PageHeader title={t("renewals.title")} description={t("renewals.subtitle")} />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label={t("renewals.kpi.window")}
          value={summary.expiring30.length}
          icon={CalendarClock}
          tone="warning"
          hint={t("renewals.kpi.windowHint")}
        />
        <KpiCard
          label={t("renewals.kpi.cost")}
          value={summary.totalRenewalCost}
          icon={Wallet}
          format="money"
          currency={workspaceCurrency}
          hint={t("renewals.kpi.costHint")}
        />
        <KpiCard
          label={t("renewals.kpi.renewed")}
          value={summary.renewedDomains}
          icon={Repeat}
          hint={t("renewals.kpi.renewedHint")}
        />
        <KpiCard
          label={t("renewals.kpi.review")}
          value={unreviewed}
          icon={FileSearch}
          tone={unreviewed > 0 ? "negative" : "neutral"}
          hint={t("renewals.kpi.reviewHint")}
        />
      </div>

      <SegmentedControl<RenewalWindow>
        value={window}
        onValueChange={setWindow}
        ariaLabel={t("renewals.windows")}
        options={[
          { value: "30", label: t("renewals.window30") },
          { value: "60", label: t("renewals.window60") },
          { value: "90", label: t("renewals.window90") },
          { value: "expired", label: t("renewals.windowExpired") },
        ]}
      />

      {isError ? (
        <ErrorState onRetry={() => void refetch()} retrying={isFetching} />
      ) : (
        <DataTable<DerivedDomain>
          columns={columns}
          data={list}
          getRowId={row => row.id}
          isLoading={isLoading}
          initialSorting={[{ id: "daysLeft", desc: false }]}
          emptyState={
            <EmptyState
              compact
              icon={CalendarClock}
              title={t("renewals.empty")}
              description={t("renewals.emptyHint")}
            />
          }
        />
      )}

      <RenewDomainDialog
        open={Boolean(renewTarget)}
        onOpenChange={open => {
          if (!open) setRenewTarget(null);
        }}
        domain={renewTarget}
        currency={renewTarget?.purchase_currency ?? workspaceCurrency}
        onConfirm={async ({ renewalCost, note }) => {
          if (!renewTarget) return;
          // The RPC records the cost and moves the expiry a year ahead, so the
          // row leaves whichever window it was sitting in.
          const updated = await renewMutation.mutateAsync({ domainId: renewTarget.id, renewalCost, note });
          toast.success(
            t("domains.detail.renewed", { domain: updated.domain, date: formatDate(updated.expiry_date) })
          );
        }}
      />
    </div>
  );
}
